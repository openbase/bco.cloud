const socketIO = require('socket.io'); // web socket communication
const request = require('request'); // do http requests
const db = require("./db");

const CONNECTION_EVENT = "connection";
const DISCONNECT_EVENT = "disconnect";
const LOGIN_EVENT = "login";
const REGISTER_EVENT = "register";
const REMOVE_EVENT = "remove";
const REQUEST_SYNC_EVENT = "requestSync";

const HEADER_BCO_ID_KEY = "id";

const AUTHENTICATED_SOCKETS = {};

const initSocketIO = function (server) {
    // add web socket to the http server
    const io = socketIO(server);

    // add middleware which is executed once a socket is created
    io.use(function (socket, next) {
        // get bco id from header
        let bcoId = socket.handshake.headers[HEADER_BCO_ID_KEY];

        console.log("Id[" + bcoId + "]");
        // validate that id is set
        if (!bcoId) {
            return next(new Error("BCO id is missing!"));
        }
        // add bco id to socket object to allow easy access later
        socket.bcoid = bcoId;

        next();
    });

    // tell socket what to do when a connection from a client is initialized
    io.on(CONNECTION_EVENT, function (socket) {
        initSocket(socket);
    });
};

const initSocket = function (socket) {
    console.log('a user connected with id: ' + socket.id);

    // create timeout that will automatically disconnect the socket connection if not authenticated until then
    let time = 30 * 1000;
    let authenticationTimeout = setTimeout(() => socket.disconnect(true), time);

    // add a middleware, which will be executed before everything else;
    socket.use(function (packet, next) {
        // if already logged in go on
        if (AUTHENTICATED_SOCKETS[socket.bcoid]) {
            return next();
        }

        // if not logged in still let login or registration attempts through
        let eventName = packet[0];
        if (eventName === LOGIN_EVENT || eventName === REGISTER_EVENT) {
            return next();
        }

        // cause error
        next(new Error("Invalid request without being logged in"))
    });

    // handle login attempts
    socket.on(LOGIN_EVENT, (data, callback) => {
        if (!callback || typeof callback !== "function") {
            let error = new Error("Did not receive valid callback[" + callback + "]");
            console.log("Error on login: " + error);
            return error;
        }
        return login(socket, authenticationTimeout, data, callback);
    });

    // handle user registration
    socket.on(REGISTER_EVENT, (data, callback) => {
        if (!callback || typeof callback !== "function") {
            let error = new Error("Did not receive valid callback[" + callback + "]");
            console.log("Error on register: " + error);
            return error;
        }
        return register(socket, data, callback)
    });

    // handle disconnections
    socket.on(DISCONNECT_EVENT, () => {
        console.log("socket[" + socket.id + "] disconnected");
        // remove socket from authorized socket map
        delete AUTHENTICATED_SOCKETS[socket.bcoid];
    });

    // handle sync requests
    socket.on(REQUEST_SYNC_EVENT, function (callback) {
        if (!callback || (typeof callback) !== "function") {
            let error = new Error("Did not receive valid callback[" + callback + "]");
            console.log("Error on request sync: " + error);
            return error;
        }
        return requestSync(socket, callback);
    });

    // handle remove requests
    socket.on(REMOVE_EVENT, function (callback) {
        if (!callback || (typeof callback) !== "function") {
            let error = new Error("Did not receive valid callback[" + callback + "]");
            console.log("Error on remove: " + error);
            return error;
        }
        return remove(socket, callback);
    });
};

const ACCESS_TOKEN_KEY = "accessToken";
const EMAIL_HASH_KEY = "email_hash";
const PASSWORD_HASH_KEY = "password_hash";
const PASSWORD_SALT_KEY = "password_salt";
const USERNAME_KEY = "username";

const login = async function (socket, authenticationTimeout, data, callback) {
    // parse received data which should be a json string
    let parsedData = JSON.parse(data);

    // if token has been send, validate it, else validate by username and password
    if (parsedData[ACCESS_TOKEN_KEY]) {
        console.log("Authenticated with token[" + parsedData[ACCESS_TOKEN_KEY] + "]");
        try {
            let tokenData = await db.tokens.findByToken(parsedData[ACCESS_TOKEN_KEY]);
            console.log("Found tokenData: " + JSON.stringify(tokenData) + " for token[" + parsedData[ACCESS_TOKEN_KEY] + "]");
            if (!tokenData || tokenData.client_id !== socket.bcoid) {
                reportError(callback, new Error("Invalid access token"));
                return;
            }
            // valid login
            console.log("Received valid token");

            // stop timeout
            clearTimeout(authenticationTimeout);

            // save this socket with its bco id
            AUTHENTICATED_SOCKETS[socket.bcoid] = socket;
            return callback(JSON.stringify({success: true}));
        } catch (e) {
            reportError(callback, e);
            return;
        }
    }

    reportError(callback, new Error("Access token missing"));
};

const register = async function (socket, data, callback) {
    // parse received data which should be a json string
    let parsedData = JSON.parse(data);
    let username = parsedData[USERNAME_KEY];
    let emailHash = parsedData[EMAIL_HASH_KEY];
    let passwordHash = parsedData[PASSWORD_HASH_KEY];
    let passwordSalt = parsedData[PASSWORD_SALT_KEY];

    if (!(username && emailHash && passwordHash && passwordSalt)) {
        return callback("Registration information is missing");
    }

    console.log("Register user[" + username + "]");
    // validate that correct
    try {
        // save user if not already there
        let userId;
        if (await db.users.isUsernameUsed(username)) {
            reportError(callback, new Error("Cannot register user because username[" + username + "] is already used"));
            return;
        }
        userId = await db.users.save(username, passwordHash, passwordSalt, emailHash);
        // save bco as client if not already there
        if ((await db.clients.findById(socket.bcoid)) === undefined) {
            await db.clients.save(socket.bcoid, null, null);
        }

        // create and return access token
        let tokenData = await db.tokens.findByUserClientAndType(db.tokens.TOKEN_TYPE.ACCESS, userId, socket.bcoid);
        let token;
        if (tokenData === undefined) {
            token = await db.tokens.generateToken(db.tokens.TOKEN_TYPE.ACCESS, userId, socket.bcoid);
        } else {
            token = tokenData.token;
        }
        return callback(JSON.stringify({
            success: true,
            accessToken: token
        }));
    } catch (e) {
        reportError(callback, e)
    }
};

const SYNC_API_KEY = process.env.GOOGLE_API_KEY;
const SYNC_REQUEST_URI = "https://homegraph.googleapis.com/v1/devices:requestSync?key=" + SYNC_API_KEY;

const requestSync = function (socket, callback) {
    console.log("Perform request sync");

    // api key is not defined locally, so if started locally just print a debug message
    if (!SYNC_API_KEY) {
        console.log("Perform sync request for user[" + socket.bcoid + "]");
        return;
    }

    let options = {
        uri: SYNC_REQUEST_URI,
        method: "POST",
        json: {
            agentUserId: socket.bcoid
        }
    };

    console.log("Request properties: " + JSON.stringify(options));

    // perform post request
    request(options, (error, response, body) => {
        if (error) {
            reportError(callback, error);
        } else {
            if (body.error) {
                reportError(callback, new Error(body.error.code + ": " + body.error.message))
            } else {
                console.log("RequestSync successful: " + JSON.stringify(body));
                callback(JSON.stringify({success: true}));
            }
        }
    });
};

const remove = async function (socket, callback) {
    console.log("Perform remove request");

    // this function can only be used when already logged in and removes the currently logged in client and
    // all the data belonging to the user using it

    try {
        // find user account for belonging to the socket connections
        let userId = (await db.tokens.findByClient(socket.bcoid))[0].user_id;
        console.log("Found user [" + userId + "]");
        let rows = await db.tokens.findByUser(userId);
        console.log("Found tokens: " + JSON.stringify(rows));
        // delete all token for the user (including the one for the bco client)
        for (let i = 0; i < rows.length; i++) {
            console.log("Remove token: " + JSON.stringify(rows[i]));
            await db.tokens.deleteToken(rows[i].token)
        }
        // delete the bco client
        console.log("Delete client [" + socket.bcoid + "]");
        await db.clients.deleteById(socket.bcoid);
        // delete the user
        console.log("Delete user [" + userId + "]");
        await db.users.deleteById(userId);
        // report success
        callback(JSON.stringify({success: true}));
    } catch (e) {
        reportError(callback, e);
    }
};

const UNCONNECTED_ANSWER = "Base Cube One ist nicht mit der Cloud verbunden.";
const handleAction = async function (conversation, intent, argument) {
    console.log("Handle intent[" + intent + "] with argument[" + JSON.stringify(argument) + "]");
    let tokenData = await db.tokens.findByToken(conversation.user.access.token);
    let bcoId = await db.tokens.findBCOIdForUser(tokenData.user_id);
    let socket = getSocketByBCOId(bcoId);
    if (socket) {
        return new Promise(function (resolve, reject) {
            let timeout = setTimeout(() => reject(new Error("Timeout")), 3000);
            socket.emit(intent, argument, (response) => {
                clearTimeout(timeout);
                conversation.close(response);
                resolve();
            });
        });
    } else {
        conversation.close(UNCONNECTED_ANSWER)
    }
};

const getSocketByBCOId = function (id) {
    return AUTHENTICATED_SOCKETS[id];
};

const reportError = function (callback, error) {
    console.log(error.message + ": " + error.stack);
    callback(JSON.stringify({
        success: false,
        error: error.message
    }));
};

module.exports.initSocketIO = initSocketIO;
module.exports.getSocketByBCOId = getSocketByBCOId;
module.exports.handleAction = handleAction;