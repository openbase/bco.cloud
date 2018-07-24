const passport = require('passport'); // plugin handling login
const LocalStrategy = require('passport-local').Strategy; // plugin for passport to handle login via html form
const BasicStrategy = require('passport-http').BasicStrategy;
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;
const db = require('./db');
const utils = require('./utils');

passport.use(new LocalStrategy({}, async function (username, password, done) {
    try {
        let user = await db.users.findByUsername(username);

        if (!user) {
            return done(null, false);
        }

        if (user.password_hash !== utils.hashPassword(password, user.password_salt)) {
            return done(null, false);
        }

        return done(null, user);
    } catch (e) {
        return done(e)
    }
}));

passport.serializeUser(function (user, done) {
    done(null, user.username);
});

passport.deserializeUser(async function (username, done) {
    try {
        return done(null, await db.users.findByUsername(username));
    } catch (e) {
        return done(e);
    }
});

/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * These strategies are used to authenticate registered OAuth clients. They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens. The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate. Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header). While this approach is not recommended by
 * the specification, in practice it is quite common.
 */
async function verifyClient(clientId, clientSecret, done) {
    try {
        client = await db.clients.findById(clientId);

        if (!client) {
            return done(null, false);
        }

        if (client.secret !== clientSecret) {
            return done(null, false);
        }

        return done(null, client);
    } catch (e) {
        return done(e);
    }
}

passport.use(new BasicStrategy(verifyClient));

passport.use(new ClientPasswordStrategy(verifyClient));


passport.use(new BearerStrategy(async function (accessToken, done) {
        console.log("Authenticate with accessToken[" + accessToken + "]");
        try {
            let token = await db.tokens.findByToken(accessToken);
            if (!token) {
                return done(null, false);
            }

            if (token.user_id) {
                let user = await db.users.findById(token.user_id);
                if (!user) {
                    return done(null, false);
                }
                // To keep this example simple, restricted scopes are not implemented,
                // and this is just for illustrative purposes.
                return done(null, user, {scope: '*'});
            } else {
                // The request came from a client only since userId is null,
                // therefore the client is passed back instead of a user.
                let client = await db.clients.findById(token.client_id);
                if (!client) {
                    return done(null, false);
                }
                // To keep this example simple, restricted scopes are not implemented,
                // and this is just for illustrative purposes.
                return done(null, client, {scope: '*'});
            }
        } catch (e) {
            return done(e)
        }
    }
));

