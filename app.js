// import dependencies/modules
const http = require('http'); // basic http server
const express = require('express'); // improvement of http
const socketIO = require('socket.io'); // web socket communication
const bodyParser = require('body-parser'); // plugin for express to parse user input into body object
const cookieParser = require('cookie-parser'); // plugin for express to retrieve cookies
const passport = require('passport'); // plugin handling login
const expressSession = require('express-session');
const request = require('request'); // do http requests
const connectEnsureLogin = require('connect-ensure-login');
const pgSession = require('connect-pg-simple')(expressSession);

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
const API_KEY = process.env.GOOGLE_API_KEY || '';

// create a parser for information given via URL
// the extended flag says which library is used, false means a simpler version
const urlencodedParser = bodyParser.urlencoded({extended: false});

// use cookie parser no matter which http request or which path
app.use(cookieParser(SESSION_SECRET));
app.use(bodyParser.json({extended: false}));
app.use(bodyParser.urlencoded({extended: false}));
// app.use(errorHandler());
app.use(expressSession({
        store: new pgSession({
            pool: db.pool,
        }),
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000 // cookie expires after 24 hours
        }
    }
));
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
app.get('/register', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
    response.render('register');
});
app.get('/registerClient', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
    response.render('registerClient');
});
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

// tell the server what to do on a http post request on '/login'
app.post('/login', urlencodedParser, passport.authenticate('local', {
    successReturnToOrRedirect: '/',
    failureRedirect: '/login'
}));
app.post('/register', urlencodedParser, connectEnsureLogin.ensureLoggedIn(), (request, response) => {
    db.users.save(request.body.username, request.body.password, (error) => {
        //TODO: handle correctly
        if (error) {
            response.send("ERROR: " + error);
        }

        response.redirect('/');
    });
});
app.post('/registerClient', urlencodedParser, connectEnsureLogin.ensureLoggedIn(), (request, response) => {
    db.clients.save(request.body.clientId, request.body.redirectURI, request.body.secret, (error) => {
        //TODO: handle correctly
        if (error) {
            response.send("ERROR: " + error);
        }

        response.redirect('/');
    });
});

// http://localhost:5000/auth?client_id=GoogleAtBCO&redirect_uri=http://localhost:5000&state=state&scope=REQUESTED_SCOPES&response_type=code
app.get('/auth', routes.authorization);
app.post('/auth/decision', routes.decision);
app.post('/oauth/token', routes.token);

const {dialogflow} = require('actions-on-google');
const df = dialogflow();
df.intent("register scene", (conv, {location, label}) => {
    console.log("Should now register a scene named[" + label + "] in[" + location + "]");
    conv.close("Erledigt.");
});
df.intent('favorite color', (conv, {color}) => {
    console.log(JSON.stringify(conv));
    conv.close("Your favorite color is [" + color + "]");
});
df.intent('user-activity', (conv, {activity}) => {
    conv.close("Du machst gerade [" + activity + "]");
});

app.post('/fulfillment/action', function (request, response, next) {
    console.log(JSON.stringify(request.body));
    next();
}, df);

app.post('/fulfillment',
    // validate authentication via token
    passport.authenticate('bearer', {session: false}),
    // send request via web socket and retrieve response
    function (request, response) {
        console.log("Received request from google:\n" + JSON.stringify(request.body));

        // parse access token from header
        let accessToken = request.headers.authorization.replace("Bearer ", "");

        // get according token data from the database
        db.tokens.findByToken(accessToken, (error, tokenData) => {
            if (error || tokenData === undefined) {
                // this should not happen because the token is already verified by the authentication
                console.log(error)
            }

            // find another token for this user but a different client
            // this is the token with the bco id as the client id
            db.tokens.findByUserAndNotClient(tokenData.user_id, tokenData.client_id, (error, data) => {
                if (error) {
                    console.log(error);
                    response.status(400).send(error);
                }

                // use the socket with the given bco id
                if (!loggedInSockets[data.client_id]) {
                    console.log("Ignore request because user[" + data.client_id + "] is currently not connected");
                    response.status(400).send("The requested client is currently not connected");
                } else {
                    loggedInSockets[data.client_id].send(JSON.stringify(request.body), (data) => {
                        response.set('Content-Type', 'application/json');
                        response.send(data);
                    });
                }
            });


        });
    }
);

let loggedInSockets = {};

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

    // create timeout that will automatically disconnect the socket connection if not authenticated until then
    let time = 30 * 1000;
    let authenticationTimeout = setTimeout(() => socket.disconnect(true), time);

    // add a middleware, which will be executed before everything else;
    socket.use((packet, next) => {
        // if already logged in go on
        if (loggedInSockets[socket.bcoid]) {
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
            db.tokens.findByToken(token, (error, tokenData) => {
                console.log("Found tokenData: " + JSON.stringify(tokenData) + " for token[" + token + "]")
                if (error || !tokenData || tokenData.client_id !== socket.bcoid) {
                    return callback("ERROR: Invalid access token");
                }

                // valid login
                console.log("Received valid token");

                // stop timeout
                clearTimeout(authenticationTimeout);

                // save this socket with its bco id
                loggedInSockets[socket.bcoid] = socket;
                return callback(JSON.stringify({success: true}));
            })
        }

        // if username and password are send validate them and generate token
        if (username && password) {
            console.log("Username[" + username + "], password[" + password + "]");
            // validate that correct
            return db.users.findByUsername(username, function (error, user) {
                // user could not be found or user password combination is invalid
                if (error || !user || user.password_hash !== utils.hashPassword(password, user.password_salt)) {
                    return callback("ERROR: Invalid combination of username and password");
                }

                // valid login so stop timeout
                clearTimeout(authenticationTimeout);

                // save that this socket is validated
                loggedInSockets[socket.bcoid] = socket;

                const returnAccessToken = function () {
                    // send back access token
                    console.log("Generate and send accessToken");
                    db.tokens.findByUserClientAndType(db.tokens.TOKEN_TYPE.ACCESS, user.id, socket.bcoid, (error, token) => {
                        if (error) {
                            console.log(error);
                            return callback("ERROR: Could not check if access token for this user and client combination already exists");
                        }

                        if (token !== undefined) {
                            // token already exists, send it again with success
                            return callback(JSON.stringify({
                                success: true,
                                accessToken: token.token
                            }));
                        }

                        // token does not already exist so generate and save a new one
                        db.tokens.generateToken(db.tokens.TOKEN_TYPE.ACCESS, user.id, socket.bcoid, (error, newToken) => {
                            if (error) {
                                console.log(error);
                                return callback("Error while generating an access token!");
                            }

                            // return accessToken and success
                            return callback(JSON.stringify({
                                success: true,
                                accessToken: newToken.token
                            }));
                        });
                    });
                };

                // register bco as client of not already done
                db.clients.findById(socket.bcoid, (error, client) => {
                    if (error) {
                        console.log(error);
                        return callback("ERROR: Could not validate if bco is already registered as a client");
                    }

                    // client already exists
                    if (client !== undefined) {
                        returnAccessToken();
                    } else {
                        db.clients.save(socket.bcoid, null, null, (error) => {
                            if (error) {
                                console.log(error);
                                return callback("ERROR: Could not save bco instance as a client");
                            }
                            returnAccessToken();
                        })
                    }
                });
            });
        }

        callback("ERROR: Missing login information");
    });

    // what to do when disconnected
    socket.on('disconnect', () => {
        console.log('socket[' + socket.id + '] disconnected');
        delete loggedInSockets[socket.bcoid];
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

        console.log("Request properties: " + JSON.stringify(options));

        // perform post request
        request(options, (error, response, body) => {
            if (error) {
                console.log(error + " " + JSON.stringify(body));
                callback(error);
            } else {
                console.log("RequestSync successful: " + JSON.stringify(body));
            }
        })
    });
});

// start the server and tell it to listen on the given port
server.listen(PORT, function () {
    // this function is called when the server is started
    console.log('listening on: ' + PORT);
});

// Graceful shutdown
process.on('SIGINT', () => {
    const cleanUp = () => {
        // Clean up other resources like DB connections
        db.pool.end();
    };

    console.log('Closing server...');
    server.close(() => {
        console.log('Server shutdown!');

        cleanUp();
        process.exit();
    });

    // Force close server after 5secs
    setTimeout((e) => {
        console.log('Forcing server shutdown!', e);

        cleanUp();
        process.exit(1);
    }, 5000);
});
