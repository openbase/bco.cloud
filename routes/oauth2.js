const oauth2orize = require('oauth2orize');
const passport = require('passport');
const db = require('../db');
const connectEnsureLogin = require('connect-ensure-login');
// const utils = require('../utils');

// Create OAuth 2.0 server
const server = oauth2orize.createServer();

// Register serialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated. To complete the transaction, the
// user must authenticate and approve the authorization request. Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session. Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

// get client id from stored client objects
server.serializeClient((client, done) => done(null, client.id));

// get client object from storage
server.deserializeClient((id, done) => {
    db.clients.findById(id, (error, client) => {
        if (error) return done(error);
        return done(null, client);
    });
});

//TODO: if tokens already exist, retrieve them because generating new ones will fail
// why is the client secret never checked?
// test if this implementation can be modified to fit the implicit flow by google
// tokens currently to not expire

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources. It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes. The callback takes the `client` requesting
// authorization, the `redirectUri` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application. The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(oauth2orize.grant.code((client, redirectUri, user, ares, done) => {
    // const code = utils.generateKey();
    console.log("Generated authCode[" + client.id + ", " + redirectUri + ", " + user.username + "]");
    db.tokens.generateToken(db.tokens.TOKEN_TYPE.AUTH_CODE, user.id, client.id, (error, token) => {
        if (error) {
            return done(error);
        }
        return done(null, token);
    });
    // db.authorizationCodes.save(code, client.id, redirectUri, user.id, (error) => {
    //     if (error) return done(error);
    //     return done(null, code);
    // });
}));

// Exchange authorization codes for access tokens. The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.
server.exchange(oauth2orize.exchange.code((client, code, redirectUri, done) => {
    db.tokens.findByToken(code, (error, authCode) => {
        if (error) return done(error);
        if (client.id !== authCode.client_id) return done(null, false);
        // if (redirectUri !== client.redirect_uri) return done(null, false);

        console.log("Generates accessToken[" + authCode.user_id + ", " + authCode.clientId + "]");
        db.tokens.generateToken(db.tokens.TOKEN_TYPE.ACCESS, authCode.user_id, client.id, (error, token) => {
            if (error) {
                return done(error);
            }
            return done(null, token);
        });
        // const token = utils.generateKey();
        // db.accessTokens.save(token, authCode.username, authCode.clientId, (error) => {
        //     if (error) return done(error);
        //     return done(null, token);
        // });
    });
}));

// User authorization endpoint.
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request. In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary accross
// implementations. Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction. It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization). We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.

// pipeline of callback for authorization
module.exports.authorization = [
    connectEnsureLogin.ensureLoggedIn(),
    server.authorization((clientId, redirectUri, done) => {
        console.log("User is logged in, verify for clientId[" + clientId + "] and redirectURI[" + redirectUri + "]");
        db.clients.findById(clientId, (error, client) => {
            if (error) {
                return done(error);
            }

            if (!client) {
                return done(new Error("Client with id[" + clientId + "] does not exist"))
            }

            // if (client.redirect_uri !== redirectUri) {
            //     return done(new Error("Redirect URI does not match"))
            // }

            return done(null, client, redirectUri);
        });
    }),
    (request, response) => {
        response.render('dialog', {
            transactionId: request.oauth2.transactionID,
            user: request.user,
            client: request.oauth2.client
        });
    }
];

// User decision endpoint.
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application. Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.
exports.decision = [
    connectEnsureLogin.ensureLoggedIn(),
    server.decision(),
];


// Token endpoint.
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens. Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request. Clients must
// authenticate when making requests to this endpoint.
exports.token = [
    passport.authenticate(['basic', 'oauth2-client-password'], {session: false}),
    server.token(),
    server.errorHandler(),
];
