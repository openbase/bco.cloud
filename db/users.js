const users = [
    {username: 'bcouser', password: 'passwordbco'}
];

exports.findUser = function (username, callback) {
    process.nextTick(() => {
        if (username === users[0].username) {
            callback(null, users[0]);
        } else {
            callback(new Error('User[' + username + '] does not exist!'));
        }
    });
};