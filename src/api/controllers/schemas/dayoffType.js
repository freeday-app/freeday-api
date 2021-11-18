const Tools = require('../../../services/tools.js');

module.exports = {

    list: {
        enabled: {
            in: 'query',
            type: 'Boolean',
            optional: true
        },
        displayed: {
            in: 'query',
            type: 'Boolean',
            optional: true
        },
        important: {
            in: 'query',
            type: 'Boolean',
            optional: true
        }
    },

    get: {
        id: {
            in: 'params',
            type: 'MongoId'
        }
    },

    create: {
        name: {
            in: 'body',
            type: 'String',
            check: (str) => Tools.isString(str, 1, 75)
        },
        emoji: {
            in: 'body',
            type: 'String',
            optional: true,
            allowNull: true
        },
        enabled: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        displayed: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        important: {
            in: 'body',
            type: 'Boolean',
            optional: true
        }
    },

    update: {
        id: {
            in: 'params',
            type: 'MongoId'
        },
        name: {
            in: 'body',
            type: 'String',
            check: (str) => Tools.isString(str, 1, 75),
            optional: true
        },
        emoji: {
            in: 'body',
            type: 'String',
            optional: true,
            allowNull: true
        },
        enabled: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        displayed: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        important: {
            in: 'body',
            type: 'Boolean',
            optional: true
        }
    }

};
