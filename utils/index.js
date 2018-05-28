const crypto = require('crypto');

module.exports.generateKey = function (length) {
    let byteNumber = 16;
    if (length) {
        byteNumber = length;
    }

    return crypto.randomBytes(byteNumber).toString('base64');
};