const {Pool} = require('pg');

let pool;
module.exports.getPool = function () {
    if (pool === undefined) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: true,
            max: 20
        });
    }
    return pool;
};