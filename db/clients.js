// pool used to communicate with the database
const pool = require('./pool').getPool();

const REGISTER_QUERY = 'INSERT INTO clients (id, redirect_uri, secret) VALUES ($1, $2, $3)';
const save = async function (id, redirectUri, secret) {
    await pool.query(REGISTER_QUERY, [id, redirectUri, secret]);
};

const FIND_BY_ID_QUERY = "SELECT * FROM clients WHERE clients.id = $1";
const findById = async function (id) {
    return (await pool.query(FIND_BY_ID_QUERY, [id])).rows[0];
};

module.exports.save = save;
module.exports.findById = findById;