const codes = {};

module.exports.find = function (key, done) {
    if (codes[key]) {
        return done(null, codes[key]);
    }
    return done(new Error("Authorization code not found"));
};

module.exports.save = function (key, clientId, redirectURI, username, done) {
    if (codes[key]) {
        return done(new Error("Authorization code already exists"));
    }
    codes[key] = {clientId, redirectURI, username};
    done();
};