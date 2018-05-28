const users = [
    {username: 'bco', password: 'pwd'}
];

module.exports.findByUsername = function (username, done) {
    for (let i = 0; i < users.length; i++) {
        if (users[i].username === username) {
            return done(null, users[i]);
        }
        return done(new Error("User not found"));
    }
};