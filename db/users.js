const TEST_USER = process.env.TEST_USER || 'bco';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'pwd';

const users = [
    {username: TEST_USER, password: TEST_PASSWORD}
];

module.exports.findByUsername = function (username, done) {
    for (let i = 0; i < users.length; i++) {
        if (users[i].username === username) {
            return done(null, users[i]);
        }
        return done(new Error("User not found"));
    }
};