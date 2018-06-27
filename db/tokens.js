// util used to generate tokens
const utils = require('../utils');
// pool used to communicate with the database
const pool = require('./pool').getPool();

const TOKEN_TYPE = Object.freeze({
    ACCESS: "ACCESS",
    AUTH_CODE: "AUTH_CODE",
    REFRESH: "REFRESH"
});

// const tokens = {};
//
// const TEST_USER = process.env.TEST_USER || 'bco';
// const GOOGLE_CLIENT_ID = process.env.GOOGLE_ID || 'google';
// const TOKEN = process.env.ACCESS_TOKEN || '1234';
//
// tokens[TOKEN] = {
//     username: TEST_USER,
//     clientId: GOOGLE_CLIENT_ID
// };
//
// const codes = {};
//
// const TEST_USER = process.env.TEST_USER || 'bco';
// const GOOGLE_CLIENT_ID = process.env.GOOGLE_ID || 'google';
// const CODE = process.env.AUTH_CODE || '1234';
// const REDIRECT = ''
//
// codes[CODE] = {
//     clientId: GOOGLE_CLIENT_ID,
//     redirectURI: REDIRECT,
//     username: TEST_USER
// };

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
const generateToken = function (type, userId, clientId, done) {
    let token = utils.generateKey();
    save(token, type, userId, clientId, (error) => {
        if (error) {
            return done(error);
        }

        return done(null, token);
    });
};

const FIND_BY_TOKEN = "SELECT * FROM tokens WHERE tokens.token = $1";
const findByToken = function (token, done) {
    pool.query(FIND_BY_TOKEN, [token], (error, result) => {
        if (error) {
            return done(error);
        }

        return done(null, result.rows[0]);
    });
};

const FIND_BY_USER_CLIENT_AND_TYPE = "SELECT * FROM tokens WHERE tokens.token = $1 AND tokens.user_id = $2 AND tokens.client_id = $3";
const findByUserClientAndType = function (type, user_id, client_id, done) {
    pool.query(FIND_BY_USER_CLIENT_AND_TYPE, [type, user_id, client_id], (error, result) => {
        if (error) {
            return done(error);
        }

        return done(null, result.rows[0]);
    });
};

module.exports.TOKEN_TYPE = TOKEN_TYPE;
module.exports.save = save;
module.exports.generateToken = generateToken;
module.exports.findByToken = findByToken;
module.exports.findByUserClientAndType = findByUserClientAndType;