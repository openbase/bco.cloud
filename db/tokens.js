// util used to generate tokens
const utils = require('../utils');
// pool used to communicate with the database
const pool = require('./pool').getPool();
// validate if a string is a uuid
const validator = require('validator');

const TOKEN_TYPE = Object.freeze({
    ACCESS: "ACCESS",
    AUTH_CODE: "AUTH_CODE",
    REFRESH: "REFRESH"
});

const SAVE_TOKEN_QUERY = "INSERT INTO tokens (token, type, user_id, client_id, expires_at) VALUES ($1, $2, $3, $4, $5)";
const save = async function (token, type, userId, clientId) {
    if (TOKEN_TYPE[type] === undefined) {
        throw new Error("Invalid token type[" + type + "]");
    }

    await pool.query(SAVE_TOKEN_QUERY, [token, type, userId, clientId, null]);
};
// function that will generate a new token, but will also delete an old one if for the combination of type, user and client a token already exists
const generateToken = async function (type, userId, clientId) {
    // try to find token with given data
    let tokenData = await findByUserClientAndType(type, userId, clientId);

    //TODO: why is the old token not just returned here?
    // if token already there delete it
    if (tokenData !== undefined) {
        await deleteToken(tokenData.token);
    }

    // generate, save and return a new token
    return await internalGenerateToken(type, userId, clientId);
};
// internal function which generates a new token, saves it and returns it
const internalGenerateToken = async function (type, userId, clientId) {
    let token = utils.generateKey();
    await save(token, type, userId, clientId);
    return token;
};

const FIND_BY_TOKEN_QUERY = "SELECT * FROM tokens WHERE tokens.token = $1";
const findByToken = async function (token) {
    return (await pool.query(FIND_BY_TOKEN_QUERY, [token])).rows[0];
};

const FIND_BY_USER_CLIENT_AND_TYPE_QUERY = "SELECT * FROM tokens WHERE tokens.type = $1 AND tokens.user_id = $2 AND tokens.client_id = $3";
const findByUserClientAndType = async function (type, userId, clientId) {
    return (await pool.query(FIND_BY_USER_CLIENT_AND_TYPE_QUERY, [type, userId, clientId])).rows[0];
};

// get a token belonging to user with a different client than given
const FIND_DIFFERENT_TOKEN_FOR_USER_QUERY = "SELECT * FROM tokens WHERE user_id = $1 AND NOT client_id = $2";
const findByUserAndNotClient = async function (userId, clientId) {
    return (await pool.query(FIND_DIFFERENT_TOKEN_FOR_USER_QUERY, [userId, clientId])).rows[0];
};

const FIND_BY_CLIENT_QUERY = "SELECT * FROM tokens WHERE client_id = $1";
const findByClient = async function (clientId) {
    return (await pool.query(FIND_BY_CLIENT_QUERY, [clientId])).rows;
};

const FIND_BY_USER_QUERY = "SELECT * FROM tokens WHERE user_id = $1";
const findByUser = async function (userId) {
    return (await pool.query(FIND_BY_USER_QUERY, [userId])).rows;
};

const findBCOIdForUser = async function (userId) {
    let rows = await findByUser(userId);
    let id = undefined;
    for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let split = row.client_id.split("@");
        if (split.length === 2 && validator.isUUID(split[0]) && validator.isUUID(split[1])) {
            if (id !== undefined) {
                throw new Error("Found more than one BCO id[" + id + ", " + row.client_id + "] for user[" + userId + "]");
            }
            id = row.client_id;
        }
    }
    if (id === undefined) {
        throw new Error("BCO id not available for user[" + userId + "]");
    }
    return id;
};

const DELETE_TOKEN_QUERY = "DELETE FROM tokens WHERE token = $1";
const deleteToken = async function (token) {
    await pool.query(DELETE_TOKEN_QUERY, [token]);
};

module.exports.TOKEN_TYPE = TOKEN_TYPE;
module.exports.save = save;
module.exports.generateToken = generateToken;
module.exports.findByToken = findByToken;
module.exports.findByUserClientAndType = findByUserClientAndType;
module.exports.findByUserAndNotClient = findByUserAndNotClient;
module.exports.deleteToken = deleteToken;
module.exports.findByClient = findByClient;
module.exports.findByUser = findByUser;
module.exports.findBCOIdForUser = findBCOIdForUser;