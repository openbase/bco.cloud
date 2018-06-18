const TEST_USER = process.env.TEST_USER || 'bco';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'pwd';

// console.log("TestUser: " + TEST_USER);
// console.log("TestPassword: " + TEST_PASSWORD);

const users = [
    {username: TEST_USER, password: TEST_PASSWORD}
];

module.exports.findByUsername = function (username, done) {
    for (let i = 0; i < users.length; i++) {
        if (users[i].username === username) {
            return done(null, users[i]);
        }
        console.log("Could not find user[" + username + "]")
        return done(new Error("User not found"));
    }
};