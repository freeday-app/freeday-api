module.exports = {

    list: {
        start: {
            in: 'query',
            type: 'Date',
            optional: true
        },
        end: {
            in: 'query',
            type: 'Date',
            optional: true
        },
        type: {
            in: 'query',
            type: ['MongoId'],
            optional: true
        },
        slackUser: {
            in: 'query',
            type: ['SlackUserId'],
            optional: true
        },
        status: {
            in: 'query',
            type: 'String',
            optional: true
        },
        order: {
            in: 'query',
            type: 'String',
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
        type: {
            in: 'body',
            type: 'MongoId'
        },
        slackUserId: {
            in: 'body',
            type: 'SlackUserId'
        },
        start: {
            in: 'body',
            type: 'Date'
        },
        startPeriod: {
            in: 'body',
            type: 'String',
            optional: true
        },
        end: {
            in: 'body',
            type: 'Date',
            optional: true
        },
        endPeriod: {
            in: 'body',
            type: 'String',
            optional: true
        },
        comment: {
            in: 'body',
            type: 'String',
            optional: true
        },
        force: {
            in: 'body',
            type: 'Boolean',
            optional: true
        }
    },

    update: {
        type: {
            in: 'body',
            type: 'MongoId',
            optional: true
        },
        start: {
            in: 'body',
            type: 'Date',
            optional: true
        },
        startPeriod: {
            in: 'body',
            type: 'String',
            optional: true
        },
        end: {
            in: 'body',
            type: 'Date',
            optional: true
        },
        endPeriod: {
            in: 'body',
            type: 'String',
            optional: true
        },
        comment: {
            in: 'body',
            type: 'String',
            optional: true
        },
        cancelReason: {
            in: 'body',
            type: 'String',
            optional: true
        },
        force: {
            in: 'body',
            type: 'Boolean',
            optional: true
        }
    },

    confirm: {
        id: {
            in: 'params',
            type: 'MongoId'
        },
        force: {
            in: 'body',
            type: 'Boolean',
            optional: true
        }
    },

    cancel: {
        id: {
            in: 'params',
            type: 'MongoId'
        },
        cancelReason: {
            in: 'body',
            type: 'String',
            optional: true
        }
    },

    reset: {
        id: {
            in: 'params',
            type: 'MongoId'
        }
    }

};
