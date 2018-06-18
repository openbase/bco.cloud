const tokens = {};

const TEST_USER = process.env.TEST_USER || 'bco';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ID || 'google';
const TOKEN = process.env.ACCESS_TOKEN || '1234';

tokens[TOKEN] = {
    username: TEST_USER,
    clientId: GOOGLE_CLIENT_ID
};

module.exports.find = function (token, done) {
    if (tokens[token]) {
        return done(null, tokens[token]);
    }
    console.log("Could not find accessToken[" + token + "]");
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
    console.log("AccessTokens:\n" + JSON.stringify(tokens));
    done();
};