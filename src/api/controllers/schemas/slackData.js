module.exports = {

    listUsers: {
        deleted: {
            in: 'query',
            type: 'Boolean',
            optional: true
        }
    },

    getUser: {
        slackId: {
            in: 'params',
            type: 'SlackUserId'
        }
    },

    createUser: {
        slackId: {
            in: 'body',
            type: 'SlackUserId'
        },
        name: {
            in: 'body',
            type: 'String'
        },
        avatar: {
            in: 'body',
            type: 'String'
        },
        locale: {
            in: 'body',
            type: 'String'
        },
        forcedLocale: {
            in: 'body',
            type: 'String',
            optional: true
        },
        deleted: {
            in: 'body',
            type: 'Boolean',
            optional: true
        }
    },

    getChannel: {
        slackId: {
            in: 'params',
            type: 'SlackId'
        }
    },

    listChannels: {
        memberOnly: {
            in: 'query',
            type: 'Boolean',
            optional: true
        }
    },

    createChannel: {
        slackId: {
            in: 'body',
            type: 'SlackId'
        },
        name: {
            in: 'body',
            type: 'String'
        },
        isChannel: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        isGroup: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        isIm: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        isMpIm: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        isMember: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        isPrivate: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        archived: {
            in: 'body',
            type: 'Boolean',
            optional: true
        }
    }

};
