// import dependencies/modules
const http = require('http'); // basic http server
const express = require('express'); // improvement of http
const bodyParser = require('body-parser'); // plugin for express to parse user input into body object
const cookieParser = require('cookie-parser'); // plugin for express to retrieve cookies
const passport = require('passport'); // plugin handling login
const expressSession = require('express-session');
const connectEnsureLogin = require('connect-ensure-login');
const pgSession = require('connect-pg-simple')(expressSession);

const routes = require('./routes/oauth2');

const db = require('./db');
const utils = require('./utils');
const socketUtils = require("./socket_utils");

// passport configuration
require('./auth');

const app = express(); // create an express app
const server = http.Server(app); // add it is the http server

// read port from Heroku env or use 5000 as default
const PORT = process.env.PORT || 5000;

const SESSION_SECRET = process.env.SESSION_SECRET || 'sessionSecret';

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
app.post('/register', urlencodedParser, connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    try {
        await db.users.save(request.body.username, request.body.password, request.body.email);
        response.redirect('/');
    } catch (e) {
        //TODO: handle correctly
        response.send("ERROR: " + e)
    }
});
app.post('/registerClient', urlencodedParser, connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    try {
        await db.clients.save(request.body.clientId, request.body.redirectURI, request.body.secret);
        response.redirect('/');
    } catch (e) {
        //TODO: handle correctly
        response.send("ERROR: " + e)
    }
});

// http://localhost:5000/auth?client_id=GoogleAtBCO&redirect_uri=http://localhost:5000&state=state&scope=REQUESTED_SCOPES&response_type=code
app.get('/auth', routes.authorization);
app.post('/auth/decision', routes.decision);
app.post('/oauth/token', routes.token);

const INTENT_REGISTER_SCENE = "register_scene";
const INTENT_RELOCATE = "relocate";
const INTENT_RENAME = "rename";
const INTENT_USER_ACTIVITY = "user_activity";
const INTENT_USER_ACTIVITY_CANCELLATION = "user_activity_cancellation";
const INTENT_USER_TRANSIT = "user_transit";

const {dialogflow} = require('actions-on-google');
const df = dialogflow();
df.intent(INTENT_REGISTER_SCENE, (conversation) => {
    // let argument = {};
    // if (conversation.parameters.label) {
    //     argument.label = conversation.parameters.label;
    // }
    // if (conversation.parameters.location) {
    //     argument.location = conversation.parameters.location;
    // }
    // return socketUtils.handleAction(conversation, INTENT_REGISTER_SCENE, JSON.stringify(argument));
    return socketUtils.handleAction(conversation, INTENT_REGISTER_SCENE, ["label", "location"]);
});
df.intent(INTENT_USER_ACTIVITY, async (conversation) => {
    // let arguments = {};
    // if (conversation.parameters.activity) {
    //     arguments.activity = conversation.parameters.activity;
    // } else {
    //     arguments.activity = [];
    // }
    // if (conversation.parameters.location) {
    //     arguments.location = conversation.parameters.location;
    // }
    // return socketUtils.handleAction(conversation, INTENT_USER_ACTIVITY, arguments);
    return socketUtils.handleAction(conversation, INTENT_USER_ACTIVITY, ["activity", "location"]);
});
df.intent(INTENT_USER_ACTIVITY_CANCELLATION, async (conversation) => {
    // let arguments = {};
    // if (conversation.parameters.activity) {
    //     arguments.activity = conversation.parameters.activity;
    // } else {
    //     arguments.activity = [];
    // }
    // return socketUtils.handleAction(conversation, INTENT_USER_ACTIVITY, arguments);
    return socketUtils.handleAction(conversation, INTENT_USER_ACTIVITY, ["activity"]);
});
// df.intent(INTENT_RELOCATE, async (conversation) => {
df.intent(INTENT_RELOCATE, async (conversation, {labelCurrent, locationNew}) => {
    console.log("Conversation params: " + JSON.stringify(conversation.parameters) + ", labelCurrent: " + labelCurrent + ", locationNew: " + locationNew);
    // let arguments = {};
    // arguments.labelCurrent = labelCurrent;
    // arguments.locationNew = locationNew;
    // if (conversation.parameters.locationCurrent) {
    //     arguments.locationCurrent = conversation.parameters.locationCurrent;
    // }
    // return socketUtils.handleAction(conversation, INTENT_RELOCATE, arguments);
    return socketUtils.handleAction(conversation, INTENT_RELOCATE, ["labelCurrent, labelNew"]);
});
df.intent(INTENT_RENAME, async (conversation) => {
// df.intent(INTENT_RENAME, async (conversation, {labelCurrent, labelNew}) => {
//     let arguments = {};
//     arguments.labelCurrent = labelCurrent;
//     arguments.labelNew = labelNew;
//     if (conversation.parameters.locationCurrent) {
//         arguments.locationCurrent = conversation.parameters.locationCurrent;
//     }
//     return socketUtils.handleAction(conversation, INTENT_RENAME, arguments);
    return socketUtils.handleAction(conversation, INTENT_RENAME, ["labelCurrent", "labelNew"]);
});
df.intent(INTENT_USER_TRANSIT, async (conversation) => {
// df.intent(INTENT_USER_TRANSIT, async (conversation, {userTransit}) => {
//     return socketUtils.handleAction(conversation, INTENT_USER_TRANSIT, userTransit);
    return socketUtils.handleAction(conversation, INTENT_USER_TRANSIT, ["userTransit"]);
});
df.intent('actions.intent.TEXT', (conversation, input) => {
    console.log("Received input [" + input + "]");
    conversation.end("Okay")
});

app.post('/fulfillment/action',
    // somehow google only sends its access token in the body of the request
    // so copy it to the header where passport would expect it for correct authorization
    async function (request, response, next) {
        request.headers.authorization = "Bearer " + request.body.originalDetectIntentRequest.payload.user.accessToken;
        next();
    },
    // validate authentication via token
    passport.authenticate('bearer', {session: false}),
    df);

app.post('/fulfillment',
    // validate authentication via token
    passport.authenticate('bearer', {session: false}),
    // send request via web socket and retrieve response
    async function (request, response) {
        console.log("Received request from google:\n" + JSON.stringify(request.body));

        // parse access token from header
        let accessToken = request.headers.authorization.replace("Bearer ", "");

        try {
            let tokenData = await db.tokens.findByToken(accessToken);
            let bcoId = await db.tokens.findBCOIdForUser(tokenData.user_id);
            // use the socket with the given bco id
            if (!socketUtils.getSocketByBCOId(bcoId)) {
                console.log("Ignore request because user[" + bcoId + "] is currently not connected");
                response.status(400).send("The requested client is currently not connected");
            } else {
                socketUtils.getSocketByBCOId(bcoId).send(JSON.stringify(request.body), (data) => {
                    response.set('Content-Type', 'application/json');
                    response.send(data);
                });
            }
        } catch (e) {
            console.log(e);
            response.status(400).send(error.message);
        }
    }
);

socketUtils.initSocketIO(server);

// start the server and tell it to listen on the given port
server.listen(PORT, async function () {
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
