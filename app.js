// import dependencies/modules
const http = require('http'); // basic http server
const express = require('express'); // improvement of http
const socketIO = require('socket.io'); // web socket communication
const bodyParser = require('body-parser'); // plugin for express to parse user input into body object
const cookieParser = require('cookie-parser'); // plugin for express to retrieve cookies
const passport = require('passport'); // plugin handling login
const expressSession = require('express-session');
//TODO: this should only be used in development
const errorHandler = require('errorhandler');
const routes = require('./routes/oauth2');

// passport configuration
require('./auth');

const app = express(); // create an express app
const server = http.Server(app); // add it is the http server
const io = socketIO(server); // also add web socket to the http server

// read port from Heroku env or use 5000 as default
const PORT = process.env.PORT || 5000;

const SESSION_SECRET = process.env.SESSION_SECRET || 'sessionSecret';
const SOCKET_PWD = process.env.SOCKET_PWD || 'socketPassword';

// create a parser for information given via URL
// the extended flag says which library is used, false means a simpler version
const urlencodedParser = bodyParser.urlencoded({extended: false});

// use cookie parser no matter which http request or which path
app.use(cookieParser());
app.use(bodyParser.json({extended: false}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(errorHandler());
app.use(expressSession({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

// configure directory where express will find view files
app.set('views', __dirname + '/views');
// configure view engine to render EJS templates
app.set('view engine', 'ejs');

// tell the server what to do on an http get request on '/'
app.get('/', function (req, res) {
    // just send a string which will be displayed in the browser
    res.send('BCO Cloud prototype');
});

// tell the server what to do on an http get request on '/login'
app.get('/login', function (req, res) {
    // render views/login.ejs
    res.render('login');
});

// tell the server what to do on an http post request on '/login'
app.post('/login', urlencodedParser, passport.authenticate('local', {
    successReturnToOrRedirect: '/',
    failureRedirect: '/login'
}));

// http://localhost:5000/auth?client_id=GoogleAtBCO&redirect_uri=http://localhost:5000&state=state&scope=REQUESTED_SCOPES&response_type=code
app.get('/auth', routes.authorization);
app.post('/auth/decision', routes.decision);
app.post('/oauth/token', routes.token);

app.post('/fulfillment',
    passport.authenticate('bearer', {session: false}),
    function(request, response) {
        console.log(JSON.stringify(request.body));

        //TODO: access token should be accessible by request.params and used to find the correct socket
        if(onlySocket) {
            onlySocket.send(JSON.stringify(request.body), (data) => {
                console.log('Received response: ' + data);
                response.json(data);
            })
        } else {
            response.status(400).send('No socket connection open');
        }
    }
);


let onlySocket;

// tell socket what to do when a connection from a client is initialized
io.on('connection', function (socket) {
    console.log('a user connected with id: ' + socket.id);

    if(onlySocket) {
        // for dev purposes only support one socket connection
        socket.disconnect(true);
    }

    // initialize a timeout of 3 seconds to close the socket connection if no authentication has been performed
    let authenticationTimeout = setTimeout(() => socket.disconnect(true), 3000);

    onlySocket = socket;

    // tell socket what to do if an event with the name authenticate is send
    socket.on('authenticate', function (data) {
        console.log('authenticate with data: ' + data);

        // the last argument is a callback which can be used to give feedback to the client
        let callback = arguments[arguments.length - 1];
        // test if the data send matches the password
        if (data === SOCKET_PWD) {
            // clear the time out
            clearTimeout(authenticationTimeout);
            // inform client that authentication was a success
            callback('Authentication success!');
        } else {
            // tell client that authentication failed
            callback('Authentication failed!');
            // disconnect client, this way the client has only one chance to authenticate
            socket.disconnect(true);
            // clear timeout because already disconnect
            clearTimeout(authenticationTimeout);
        }
    });

    // tell socket what to do on disconnection, just log who disconnected
    socket.on('disconnect', () => {
        console.log('socket[' + socket.id + '] disconnected')
        onlySocket = undefined;
    });
});

// start the server and tell it to listen on the given port
server.listen(PORT, function () {
    // this function is called when the server is started
    console.log('listening on: ' + PORT);

    console.log(process.env.SESSION_SECRET || 'sessionSecret');
    console.log(process.env.SOCKET_PWD || 'socketPassword');
    console.log(process.env.GOOGLE_ID || 'google');
    console.log(process.env.GOOGLE_SECRET || 'googleSecret');
});
