const Tools = require('../../../services/tools.js');
const UserSchema = require('./user.js');

module.exports = {

    login: {
        username: {
            in: 'body'
        },
        password: {
            in: 'body'
        }
    },

    check: {
        authorization: {
            in: 'headers',
            parse: (value) => value.replace('Bearer ', '')
        }
    },

    subscribe: {
        email: {
            in: 'body',
            type: 'Email'
        },
        key: {
            in: 'body'
        },
        username: {
            in: 'body',
            check: (str) => Tools.isString(str, 3) && /^[a-zA-Z0-9]+$/.test(str)
        },
        password: {
            in: 'body',
            check: () => (str) => Tools.isString(str, 6)
        }
    },

    welcome: {
        ...UserSchema.create
    }

};
