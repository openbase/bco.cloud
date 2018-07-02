// util used to generate tokens
const utils = require('../utils');
// pool used to communicate with the database
const pool = require('./pool').getPool();

const TOKEN_TYPE = Object.freeze({
    ACCESS: "ACCESS",
    AUTH_CODE: "AUTH_CODE",
    REFRESH: "REFRESH"
});

const SAVE_TOKEN_QUERY = "INSERT INTO tokens (token, type, user_id, client_id, expires_at) VALUES ($1, $2, $3, $4, $5)";
const save = function (token, type, userId, clientId, done) {
    if (TOKEN_TYPE[type] === undefined) {
        done(new Error("Invalid token type[" + type + "]"));
    }

    pool.query(SAVE_TOKEN_QUERY, [token, type, userId, clientId, null], (error) => {
        if (error) {
            return done(error);
        }

        return done();
    });
};
// function that will generate a new token, but will also delete an old one if for the combination of type, user and client a token already exists
const generateToken = function (type, userId, clientId, done) {
    db.tokens.findByUserClientAndType(type, userId, clientId, (error, tokenData) => {
        if (error) {
            return done(error);
        }

        if (tokenData !== undefined) {
            db.tokens.deleteToken(tokenData.token, (error) => {
                if (error) {
                    return done(error);
                }

                internalGenerateToken(type, userId, clientId, (error, token) => {
                    if (error) {
                        return done(error);
                    }

                    return done(null, token);
                });
            });
        } else {
            internalGenerateToken(type, userId, clientId, (error, token) => {
                if (error) {
                    return done(error);
                }

                return done(null, token);
            });
        }
    });
};
// internal function which generates a new token, saves it and returns it
const internalGenerateToken = function (type, userId, clientId, done) {
    let token = utils.generateKey();
    save(token, type, userId, clientId, (error) => {
        if (error) {
            return done(error);
        }

        return done(null, token);
    });
};

const FIND_BY_TOKEN_QUERY = "SELECT * FROM tokens WHERE tokens.token = $1";
const findByToken = function (token, done) {
    pool.query(FIND_BY_TOKEN_QUERY, [token], (error, result) => {
        if (error) {
            return done(error);
        }

        return done(null, result.rows[0]);
    });
};

const FIND_BY_USER_CLIENT_AND_TYPE_QUERY = "SELECT * FROM tokens WHERE tokens.type = $1 AND tokens.user_id = $2 AND tokens.client_id = $3";
const findByUserClientAndType = function (type, userId, clientId, done) {
    pool.query(FIND_BY_USER_CLIENT_AND_TYPE_QUERY, [type, userId, clientId], (error, result) => {
        if (error) {
            return done(error);
        }

        return done(null, result.rows[0]);
    });
};

// get a token belonging to user with a different client than given
const FIND_DIFFERENT_TOKEN_FOR_USER_QUERY = "SELECT * FROM tokens WHERE user_id = $1 AND NOT client_id = $2";
const findByUserAndNotClient = function (userId, clientId, done) {
    pool.query(FIND_DIFFERENT_TOKEN_FOR_USER_QUERY, [userId, clientId], (error, result) => {
        if (error) {
            return done(error);
        }

        return done(null, result.rows[0]);
    });
};

const DELETE_TOKEN_QUERY = "DELETE FROM tokens WHERE token = $1";
const deleteToken = function (token, done) {
    pool.query(DELETE_TOKEN_QUERY, [token], (error) => {
        if (error) {
            return done(error);
        }

        return done();
    });
};

module.exports.TOKEN_TYPE = TOKEN_TYPE;
module.exports.save = save;
module.exports.generateToken = generateToken;
module.exports.findByToken = findByToken;
module.exports.findByUserClientAndType = findByUserClientAndType;
module.exports.findByUserAndNotClient = findByUserAndNotClient;
module.exports.deleteToken = deleteToken;