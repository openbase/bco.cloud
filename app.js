// import dependencies/modules
const http = require('http'); // basic http server
const express = require('express'); // improvement of http
const socketIO = require('socket.io'); // web socket communication
const bodyParser = require('body-parser'); // plugin for express to parse user input into body object
const cookieParser = require('cookie-parser'); // plugin for express to retrieve cookies
const passport = require('passport'); // plugin handling login
const expressSession = require('express-session');
const request = require('request'); // do http requests

//TODO: this should only be used in development
const errorHandler = require('errorhandler');

const routes = require('./routes/oauth2');

const db = require('./db');
const utils = require('./utils');

// passport configuration
require('./auth');

const app = express(); // create an express app
const server = http.Server(app); // add it is the http server
const io = socketIO(server); // also add web socket to the http server

// read port from Heroku env or use 5000 as default
const PORT = process.env.PORT || 5000;

const SESSION_SECRET = process.env.SESSION_SECRET || 'sessionSecret';
const SOCKET_PWD = process.env.SOCKET_PWD || 'socketPassword';
const API_KEY = process.env.GOOGLE_API_KEY || '';

// create a parser for information given via URL
// the extended flag says which library is used, false means a simpler version
const urlencodedParser = bodyParser.urlencoded({extended: false});

// use cookie parser no matter which http request or which path
app.use(cookieParser());
app.use(bodyParser.json({extended: false}));
app.use(bodyParser.urlencoded({extended: false}));
// app.use(errorHandler());
app.use(expressSession({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

// configure directory where express will find view files
app.set('views', __dirname + '/views');
// configure view engine to render EJS templates
app.set('view engine', 'ejs');

// tell the server what to do on a http get request on '/'
app.get('/', function (req, res) {
    // just send a string which will be displayed in the browser
    res.send('BCO Cloud prototype');
});

// tell the server what to do on a http get request on '/login'
app.get('/login', function (req, res) {
    // render views/login.ejs
    res.render('login');
});

// tell the server what to do on a http post request on '/login'
app.post('/login', urlencodedParser, passport.authenticate('local', {
    successReturnToOrRedirect: '/',
    failureRedirect: '/login'
}));

// http://localhost:5000/auth?client_id=GoogleAtBCO&redirect_uri=http://localhost:5000&state=state&scope=REQUESTED_SCOPES&response_type=code
app.get('/auth', routes.authorization);
app.post('/auth/decision', routes.decision);
app.post('/oauth/token', routes.token);

app.post('/fulfillment',
    // validate authentication via token
    passport.authenticate('bearer', {session: false}),
    // send request via web socket and retrieve response
    function (request, response) {
        console.log(JSON.stringify(request.body));

        //TODO: access token should be accessible by request.params and used to find the correct socket
        if (onlySocket) {
            onlySocket.send(JSON.stringify(request.body), (data) => {
                console.log('Received response: ' + data);
                response.set('Content-Type', 'application/json');
                response.send(data);
            })
        } else {
            response.status(400).send('No socket connection open');
        }
    }
);

app.post('/test', (req, res) => {
    console.log("Received test: " + JSON.stringify(req.body));
    res.send("Success!");
});


let onlySocket;
let socketLogin = {};

// this is done once when the socket is created
io.use(function (socket, next) {
    // get bco id from header
    let id = socket.handshake.headers['id'];

    console.log("Id[" + id + "]");
    // validate that id is set
    if (!id) {
        return next(new Error("BCO id is missing!"));
    }
    // add bco id to socket object to allow easy access later
    socket.bcoid = id;

    next();
});

// tell socket what to do when a connection from a client is initialized
io.on('connection', function (socket) {
    console.log('a user connected with id: ' + socket.id);

    //TODO: sockets can be added to rooms which should be used to organize multiple connections
    if (onlySocket) {
        // for dev purposes only support one socket connection at a time
        socket.disconnect(true);
    }
    onlySocket = socket;

    // create timeout that will automatically disconnect the socket connection if not authenticated until then
    let time = 30 * 1000;
    let authenticationTimeout = setTimeout(() => socket.disconnect(true), time);

    // add a middleware, which will be executed before everything else;
    socket.use((packet, next) => {
        // if already logged in go on
        if (socketLogin[socket.id]) {
            return next();
        }

        // if not logged in still let login attempts through
        let eventName = packet[0];
        if (eventName === 'login') {
            return next();
        }

        // cause error
        next(new Error('Invalid request without being logged in'))
    });

    // handle login attempts
    socket.on('login', function (data) {
        // the last argument is a callback which can be used to give feedback to the client
        let callback = arguments[arguments.length - 1];

        // parse received data
        let parsed = JSON.parse(data);
        let username = parsed.username;
        let password = parsed.password;
        let token = parsed.accessToken;

        // if token has been send, validate it, else validate by username and password
        if (token) {
            console.log("Authenticated with token[" + token + "]");
            db.accessTokens.find(token, (error, tokenData) => {
                console.log("Found tokenData: " + JSON.stringify(tokenData) + " for token[" + token + "]")
                if (error || !tokenData || tokenData.clientId !== socket.bcoid) {
                    return callback("ERROR: Invalid access token");
                }

                // valid login
                console.log("Received valid token");

                // stop timeout
                clearTimeout(authenticationTimeout);

                // save that this socket is validated
                socketLogin[socket.id] = true;
                return callback(JSON.stringify({success: true}));
            })
        }

        // if username and password are send validate them and generate token
        if (username && password) {
            console.log("Username[" + username + "], password[" + password + "]");
            // validate that correct
            db.users.findByUsername(username, function (error, user) {
                // user could not be found or user password combination is invalid
                if (error || !user || user.password !== password) {
                    return callback("ERROR: Invalid combination of username and password");
                }

                // valid login
                console.log("Generate and send accessToken");
                // generate token
                let token = utils.generateKey(32);
                // save token for id and username
                db.accessTokens.save(token, username, socket.bcoid, () => {
                    // send token
                    socket.emit('accessToken', token);

                    // stop timeout
                    clearTimeout(authenticationTimeout);

                    // save that this socket is validated
                    socketLogin[socket.id] = true;

                    // return accessToken and success
                    return callback(JSON.stringify({
                        success: true,
                        accessToken: token
                    }));
                });
            });
        }

        callback("ERROR: Missing login information");
    });

    // what to do when disconnected
    socket.on('disconnect', () => {
        console.log('socket[' + socket.id + '] disconnected');
        onlySocket = undefined;
        delete socketLogin[socket.id];
    });

    socket.on('requestSync', function () {
        console.log("Perform request sync");
        // the last argument is a callback which can be used to give feedback to the client
        let callback = arguments[arguments.length - 1];

        // build options to perform a post request
        let options = {
            uri: "https://homegraph.googleapis.com/v1/devices:requestSync?key=" + API_KEY,
            method: "POST",
            json: {
                agentUserId: socket.bcoid
            }
        };

        // perform post request
        request(options, (error, response, body) => {
            if (error) {
                console.log(error + " " + body);
                callback(error);
            }
        })
    });
});

// start the server and tell it to listen on the given port
server.listen(PORT, function () {
    // this function is called when the server is started
    console.log('listening on: ' + PORT);
});
