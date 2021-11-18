const Tools = require('../../../services/tools.js');

module.exports = {

    get: {
        id: {
            in: 'params',
            type: 'MongoId'
        }
    },

    create: {
        username: {
            in: 'body',
            check: (str) => Tools.isString(str, 6)
        },
        password: {
            in: 'body',
            check: (str) => Tools.isString(str, 6)
        },
        language: {
            in: 'body',
            optional: true
        },
        theme: {
            in: 'body',
            check: (str) => Tools.isValidTheme(str),
            optional: true
        }
    },

    update: {
        id: {
            in: 'params',
            type: 'MongoId'
        },
        username: {
            in: 'body',
            check: (str) => Tools.isString(str, 6),
            optional: true
        },
        password: {
            in: 'body',
            check: (str) => Tools.isString(str, 6),
            optional: true
        },
        language: {
            in: 'body',
            optional: true
        },
        theme: {
            in: 'body',
            check: (str) => Tools.isValidTheme(str),
            optional: true
        }
    }

};
