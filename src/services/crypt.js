const Bcrypt = require('bcrypt');

const Tools = require('./tools.js');

const Crypt = {

    hashRounds: 10,

    async hashPassword(password) {
        const hash = await Bcrypt.hash(password, Crypt.hashRounds);
        return hash;
    },

    async verifyPassword(password, hash) {
        const verify = await Bcrypt.compare(password, hash);
        return !!verify;
    },

    encodeBase64(string, keepTrailingEquals = true) {
        const base64 = Buffer.from(string).toString('base64');
        return keepTrailingEquals ? base64 : Tools.trimChar(base64, '=');
    },

    decodeBase64(base64) {
        return Buffer.from(base64, 'base64').toString();
    }

};

module.exports = Crypt;
