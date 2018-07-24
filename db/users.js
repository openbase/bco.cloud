// util used to generate password salts and password hashes
const utils = require('../utils');
// used to generate UUIDs for users
const uuid = require('uuid/v4');
// pool used to communicate with the database
const pool = require('./pool').getPool();

const register = async function (username, password, email) {
    // generate salt
    let password_salt = utils.generateKey();
    // generate password hash
    let password_hash = utils.hashPassword(password, password_salt);
    // generate email hash
    let email_hash = utils.hashEmail(email);
    // use internal save method
    return await save(username, password_hash, password_salt, email_hash);
};

const SAVE_QUERY = 'INSERT INTO users (id, username, password_hash, password_salt, email_hash) VALUES ($1, $2, $3, $4, $5)';
const save = async function (username, password_hash, password_salt, email_hash) {
    // generate uuid
    let id = uuid();
    // execute and wait for query
    await pool.query(SAVE_QUERY, [id, username, password_hash, password_salt, email_hash]);
    // return the user id
    return id;
};

const FIND_BY_USERNAME_QUERY = 'SELECT * FROM users WHERE users.username = $1';
const findByUsername = async function (username) {
    return (await pool.query(FIND_BY_USERNAME_QUERY, [username])).rows[0];
};

const isUsernameUsed = async function (username) {
    return (await findByUsername(username)) !== undefined;
};

const FIND_BY_ID_QUERY = "SELECT * FROM users WHERE users.id = $1";
const findById = async function (id) {
    return (await pool.query(FIND_BY_ID_QUERY, [id])).rows[0];
};


module.exports.save = save;
module.exports.register = register;
module.exports.isUsernameUsed = isUsernameUsed;
module.exports.findByUsername = findByUsername;
module.exports.findById = findById;