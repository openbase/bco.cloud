// pool used to communicate with the database
const pool = require('./pool').getPool();

// const GOOGLE_CLIENT_ID = process.env.GOOGLE_ID || 'google';
// const GOOGLE_SECRET = process.env.GOOGLE_SECRET || 'googleSecret';

// console.log("GoogleClientID: " + GOOGLE_CLIENT_ID);
// console.log("GoogleSecret: " + GOOGLE_SECRET);

// const clients = [
//     {
//         id: GOOGLE_CLIENT_ID,
//         redirectURI: "https://oauth-redirect.googleusercontent.com/r/bcosmarthomeaction",
//         secret: GOOGLE_SECRET
//     }
// ];

const REGISTER_QUERY = 'INSERT INTO clients (id, redirect_uri, secret, api_key) VALUES ($1, $2, $3, $4)';
const save = function (id, redirectUri, secret, api_key, done) {
    pool.query(REGISTER_QUERY, [id, redirectUri, secret, api_key], (error) => {
        if (error) {
            return done(error);
        }

        return done();
    });
};

const FIND_BY_ID_QUERY = "SELECT * FROM clients WHERE clients.id = $1";
const findById = function (id, done) {
    pool.query(FIND_BY_ID_QUERY, [id], (error, result) => {
        if (error) {
            return done(error);
        }

        return done(null, result.rows[0]);
    });
};

module.exports.save = save;
module.exports.findById = findById;