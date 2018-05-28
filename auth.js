const passport = require('passport'); // plugin handling login
const LocalStrategy = require('passport-local').Strategy; // plugin for passport to handle login via html form
const BasicStrategy = require('passport-http').BasicStrategy;
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;
const db = require('./db');

passport.use(new LocalStrategy({}, function (username, password, done) {
    db.users.findByUsername(username, function (error, user) {
        if (error) {
            return done(error);
        }

        if (!user) {
            return done(null, false);
        }

        if (user.password !== password) {
            return done(null, false);
        }

        return done(null, user);
    });
}));

passport.serializeUser(function (user, done) {
    done(null, user.username);
});

passport.deserializeUser(function (username, done) {
    db.users.findByUsername(username, function (error, user) {
        return done(error, user);
    });
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
function verifyClient(clientId, clientSecret, done) {
    db.clients.findById(clientId, (error, client) => {
        if (error) {
            return done(error);
        }

        if (!client) {
            return done(null, false);
        }

        if (client.secret !== clientSecret) {
            return done(null, false);
        }

        return done(null, client);
    });
}

passport.use(new BasicStrategy(verifyClient));

passport.use(new ClientPasswordStrategy(verifyClient));


passport.use(new BearerStrategy(function (accessToken, done) {
        db.accessTokens.find(accessToken, (error, token) => {
            if (error) return done(error);
            if (!token) return done(null, false);
            if (token.username) {
                db.users.findByUsername(token.username, (error, user) => {
                    if (error) return done(error);
                    if (!user) return done(null, false);
                    // To keep this example simple, restricted scopes are not implemented,
                    // and this is just for illustrative purposes.
                    done(null, user, {scope: '*'});
                });
            } else {
                // The request came from a client only since userId is null,
                // therefore the client is passed back instead of a user.
                db.clients.findById(token.clientId, (error, client) => {
                    if (error) return done(error);
                    if (!client) return done(null, false);
                    // To keep this example simple, restricted scopes are not implemented,
                    // and this is just for illustrative purposes.
                    done(null, client, {scope: '*'});
                });
            }
        });
    }
));

