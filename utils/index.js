const crypto = require('crypto');

module.exports.generateKey = function (length) {
    let byteNumber = 16;
    if (length) {
        byteNumber = length;
    }

    return crypto.randomBytes(byteNumber).toString('base64');
};

module.exports.hashPassword = function(password, salt) {
    const hash = crypto.createHash('sha512');
    hash.update(password);
    hash.update(salt);
    return hash.digest('hex');
};