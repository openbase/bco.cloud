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

const {dialogflow} = require('actions-on-google');
const df = dialogflow();
df.intent("register_scene", (conv) => {
    console.log("Should now register a scene named[" + conv.parameters["label"] + "] in[" + conv.parameters["location"] + "]");
    console.log(JSON.stringify(conv, null, 2));
    conv.close("Erledigt.");
});
df.intent('user_activity', (conv, {activity}) => {
    console.log("Should now set user activity");
    console.log(JSON.stringify(conv, null, 2));
    if (socketUtils.getSocketByBCOId("bf9c54f1-6909-4e43-8a58-27001b0faa90@60c11123-6ae7-412e-8b94-25787f3f2f9b")) {
        return new Promise(function (resolve, reject) {
            let timeout = setTimeout(() => reject(new Error("Timeout")), 3000);
            socketUtils.getSocketByBCOId("bf9c54f1-6909-4e43-8a58-27001b0faa90@60c11123-6ae7-412e-8b94-25787f3f2f9b").emit("activity", activity, (response) => {
                clearTimeout(timeout);
                let res = JSON.parse(response);
                if (res.state === "success") {
                    conv.close("Deine Aktivität wurde auf " + res.activity + " gesetzt");
                } else if (res.state === "error") {
                    if (res.error === "activity not available") {
                        conv.close("Ich kann die von die ausgeführte Aktivität " + activity + " nicht finden")
                    } else {
                        conv.close("Entschuldige. Es ist ein Fehler aufgetreten.");
                    }
                } else if (res.state === "pending") {
                    conv.close("Das System brauch wohl noch ein bisschen um deine Anfrage umzusetzen");
                }
                resolve();
            });
        });
    } else {
        conv.close("Tut mit leid. Aber dein BCO System ist nicht verbunden");
    }
});
df.intent('user_transit', (conv) => {
    console.log("Should not set user transit state");
    console.log(JSON.stringify(conv, null, 2));
    let userTransit = conv.parameters["user-transit"];
    console.log("Received user transit value[" + userTransit + "]");
    /*if (socketUtils.getSocketByBCOId("60c11123-6ae7-412e-8b94-25787f3f2f9b")) {
        return new Promise(function (resolve, reject) {
            let timeout = setTimeout(() => reject(new Error("Timeout")), 3000);
            socketUtils.getSocketByBCOId("60c11123-6ae7-412e-8b94-25787f3f2f9b").emit("user transit", userTransit, (response) => {
                clearTimeout(timeout);
                if (response === "SUCCESS") {
                    conv.close("Alles klar");
                } else {
                    conv.close("Ein Fehler ist aufgetreten");
                }
                resolve();
            });
        });
    } else {
        conv.close("Tut mit leid. Aber dein BCO System ist nicht verbunden");
    }*/
    conv.close("Okay");
});

app.post('/fulfillment/action',
    async function (request, response, next) {
        console.log("Receive request for action " + JSON.stringify(request.headers, null, 4));
        console.log("Receive request for action " + JSON.stringify(request.body, null, 4));
        next();
    },
    // validate authentication via token
    passport.authenticate('bearer', {session: false}),
    // send request via web socket and retrieve response
    async function (request, response, next) {
        console.log("Received request from google:\n" + JSON.stringify(request.body));

        // parse access token from header
        let accessToken = request.headers.authorization.replace("Bearer ", "");

        try {
            let tokenData = await db.tokens.findByToken(accessToken);
            let bcoId = await db.tokens.findBCOIdForUser(tokenData.user_id);
            // use the socket with the given bco id
            console.log("Found bco id for user[" + bcoId + "]");
        } catch (e) {
            console.log(e);
            response.status(400).send(error.message);
        }

        next();
    },
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
