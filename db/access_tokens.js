const tokens = {};

module.exports.find = function (token, done) {
    if (tokens[token]) {
        return done(null, tokens[token]);
    }
    return done(new Error("Access token not found"));
};

module.exports.findByUsernameAndClientId = function (username, clientId, done) {
    for (const token in tokens) {
        if (tokens[token].username === username && tokens[token].clientId) {
            return done(null, tokens[token]);
        }
    }
    return done(new Error("Access token not found"));
};

module.exports.save = function (token, username, clientId, done) {
    if (tokens[token]) {
        return done(new Error("Access token already exists"));
    }
    tokens[token] = {username, clientId};
    done();
};