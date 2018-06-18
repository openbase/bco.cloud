const codes = {};

const TEST_USER = process.env.TEST_USER || 'bco';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ID || 'google';
const CODE = process.env.AUTH_CODE || '1234';
const REDIRECT = '';

codes[CODE] = {
    clientId: GOOGLE_CLIENT_ID,
    redirectURI: REDIRECT,
    username: TEST_USER
};

module.exports.find = function (key, done) {
    if (codes[key]) {
        return done(null, codes[key]);
    }
    console.log("Could not find authorizationCode[" + key + "]");
    return done(new Error("Authorization code not found"));
};

module.exports.save = function (key, clientId, redirectURI, username, done) {
    if (codes[key]) {
        return done(new Error("Authorization code already exists"));
    }
    codes[key] = {clientId, redirectURI, username};
    console.log("AuthorizationCodes:\n" + JSON.stringify(codes));
    done();
};