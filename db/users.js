// util used to generate password salts and password hashes
const utils = require('../utils');
// used to generate UUIDs for users
const uuid = require('uuid/v4');
// pool used to communicate with the database
const pool = require('./pool').getPool();

const REGISTER_QUERY = 'INSERT INTO users (id, username, password_hash, password_salt) VALUES ($1, $2, $3, $4)';
const save = function (username, password, done) {
    // validate that username is still available
    isUsernameUsed(username, (error, result) => {
        // error while checking if username is used
        if (error) {
            return done(error);
        }

        //username is already in use
        if (result) {
            return done(new Error("Username[" + username + "] is already used"));
        }

        // generate uuid
        let id = uuid();
        // generate salt
        let password_salt = utils.generateKey();
        // generate password hash
        let password_hash = utils.hashPassword(password, password_salt);

        // save user
        pool.query(REGISTER_QUERY, [id, username, password_hash, password_salt], (error) => {
            if (error) {
                return done(error);
            }

            return done();
        });
    });
};

const FIND_BY_USERNAME_QUERY = 'SELECT * FROM users WHERE users.username = $1';
const findByUsername = function (username, done) {
    pool.query(FIND_BY_USERNAME_QUERY, [username], (error, result) => {
        if (error) {
            return done(error);
        }

        return done(null, result.rows[0]);
    });
};

const isUsernameUsed = function (username, done) {
    pool.query(FIND_BY_USERNAME_QUERY, [username], (error, result) => {
        if (error) {
            return done(error);
        }

        // result.rows[0] is undefined if no user with that username could be found
        return done(null, result.rows[0] !== undefined);
    });
};

const FIND_BY_ID_QUERY = "SELECT * FROM users WHERE users.id = $1";
const findById = function (id, done) {
    pool.query(FIND_BY_ID_QUERY, [id], (error, result) => {
        if (error) {
            return done(error);
        }

        return done(null, result.rows[0]);
    });
};


module.exports.save = save;
module.exports.isUsernameUsed = isUsernameUsed;
module.exports.findByUsername = findByUsername;
module.exports.findById = findById;