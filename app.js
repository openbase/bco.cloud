// import dependencies/modules
const http = require('http'); // basic http server
const express = require('express'); // improvement of http
const socketIO = require('socket.io'); // web socket communication
const bodyParser = require('body-parser'); // plugin for express to parse user input into body object
const cookieParser = require('cookie-parser'); // plugin for express to retrieve cookies
const passport = require('passport'); // plugin handling login
const passportLocal = require('passport-local'); // plugin for passport to handle login via html form
const expressSession = require('express-session');
const connectEnsureLogin = require('connect-ensure-login'); // plugin which tests if logged in and if not sends to a login page

const users = require('./db/users'); // import user database

const app = express(); // create an express app
const server = http.Server(app); // add it is the http server
const io = socketIO(server); // also add web socket to the http server

passport.use(new passportLocal.Strategy({}, function (username, password, callback) {
    users.findUser(username, function (error, user) {
        if (error) {
            return callback(error);
        }

        if (user.password === password) {
            return callback(null, user);
        } else {
            return callback(null, false);
        }
    });
}));

passport.serializeUser(function (user, callback) {
    callback(null, user.username);
});

passport.deserializeUser(function (username, callback) {
    users.findUser(username, function (error, user) {
        if (error) {
            return callback(error);
        } else {
            callback(null, user);
        }
    })
});

// read port from Heroku env or use 5000 as default
const PORT = process.env.PORT || 5000;

// create a parser for information given via URL
// the extended flag says which library is used, false means a simpler version
const urlencodedParser = bodyParser.urlencoded({extended: false});

// use cookie parser no matter which http request or which path
app.use(cookieParser());
app.use(expressSession({secret: 'thisIsASecret', resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

// configure directory where express will find view files
app.set('views', __dirname + '/views');
// configure view engine to render EJS templates
app.set('view engine', 'ejs');

// tell the server what to do on an http get request on '/'
app.get('/', function (req, res) {
    connectEnsureLogin.ensureLoggedIn('/login');
    // just send a string which will be displayed in the browser
    res.send('BCO Cloud prototype');
});

// tell the server what to do on an http get request on '/login'
app.get('/login', function (req, res) {
    // render views/login.ejs
    res.render('login');
});

// tell the server what to do on an http post request on '/login'
app.post('/login', urlencodedParser, passport.authenticate('local', {failureRedirect: '/login'}), function (req, res) {
    res.redirect('/');
});

// set a password for socket communication
const pwd = "ThisIsJustAPrototype";

// tell socket what to do when a connection from a client is initialized
io.on('connection', function (socket) {
    console.log('a user connected with id: ' + socket.id);

    // initialize a timeout of 3 seconds to close the socket connection if no authentication has been performed
    let authenticationTimeout = setTimeout(() => socket.disconnect(true), 3000);

    // tell socket what to do if an event with the name authenticate is send
    socket.on('authenticate', function (data) {
        console.log('authenticate with data: ' + data);

        // the last argument is a callback which can be used to give feedback to the client
        let callback = arguments[arguments.length - 1];
        // test if the data send matches the password
        if (data === pwd) {
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
    socket.on('disconnect', () => console.log('socket[' + socket.id + '] disconnected'));
});

// start the server and tell it to listen on the given port
server.listen(PORT, function () {
    // this function is called when the server is started
    console.log('listening on: ' + PORT);
});
