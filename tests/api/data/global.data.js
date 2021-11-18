const Models = require('../../../src/api/models/index.js');

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ slackUsers

const slackUsers = [{
    slackId: 'UGJ7AYX32',
    name: 'A Come',
    avatar: 'https://fake-url-slack-avatar-12345.fr/avatar.png',
    locale: 'en',
    forcedLocale: 'fr',
    deleted: false
}, {
    slackId: 'UCB6AGX43',
    name: 'B Together',
    avatar: 'https://fake-url-slack-avatar-45678.fr/avatar.png',
    locale: 'en',
    forcedLocale: 'fr',
    deleted: false
}, {
    slackId: 'UOH72EF81',
    name: 'C Right',
    avatar: 'https://fake-url-slack-avatar-94885.fr/avatar.png',
    locale: 'fr',
    forcedLocale: 'en',
    deleted: false
}, {
    slackId: 'UPA22EF21',
    name: 'D Now',
    avatar: 'https://fake-url-slack-avatar-73755.fr/avatar.png',
    locale: 'it',
    forcedLocale: 'fr',
    deleted: true
}, {
    slackId: 'UMM82EF91',
    name: 'E Over',
    avatar: 'https://fake-url-slack-avatar-41492.fr/avatar.png',
    locale: 'fr',
    forcedLocale: 'fr',
    deleted: true
}, {
    slackId: 'UCL47EF11',
    name: 'F Me',
    avatar: 'https://fake-url-slack-avatar-82896.fr/avatar.png',
    locale: 'en',
    forcedLocale: 'en',
    deleted: true
}];

const createSlackUsers = async (ignoreDuplicate = true) => {
    for (const slackUser of slackUsers) {
        try {
            const doc = new (Models.SlackUser)(slackUser);
            await doc.save();
        } catch (err) {
            if (!ignoreDuplicate || !err.message.toLowerCase().includes('duplicate key')) {
                throw err;
            }
        }
    }
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ slackChannels

const slackChannels = [{
    slackId: 'TGJ7ACX3Y',
    name: 'Random channel',
    isChannel: true,
    isGroup: false,
    isIm: false,
    isMpIm: false,
    isMember: true,
    isPrivate: true,
    archived: false
}, {
    slackId: 'TCG6ARX53',
    name: 'Lambda channel',
    isChannel: true,
    isGroup: false,
    isIm: false,
    isMpIm: false,
    isMember: true,
    isPrivate: false,
    archived: false
}, {
    slackId: 'TOHA2EFF6',
    name: 'Another channel',
    isChannel: false,
    isGroup: true,
    isIm: false,
    isMpIm: false,
    isMember: false,
    isPrivate: false,
    archived: false
}];

const createSlackChannels = async (ignoreDuplicate = true) => {
    for (const slackChannel of slackChannels) {
        try {
            const doc = new (Models.SlackChannel)(slackChannel);
            await doc.save();
        } catch (err) {
            if (!ignoreDuplicate || !err.message.toLowerCase().includes('duplicate key')) {
                throw err;
            }
        }
    }
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ types d'absence

const dayoffTypes = [{
    name: 'Some type',
    emoji: 'scream',
    enabled: true,
    displayed: true,
    important: true
}, {
    name: 'Some other type',
    emoji: 'face_with_symbols_on_mouth',
    enabled: true,
    displayed: true,
    important: false
}, {
    name: 'Some 3rd type',
    emoji: 'upside_down_face',
    enabled: false,
    displayed: false,
    important: true
}, {
    name: 'Type',
    emoji: 'triumph',
    enabled: false,
    displayed: true,
    important: false
}, {
    name: 'Type number two',
    displayed: false,
    important: false
}, {
    name: '0123',
    emoji: null,
    enabled: false
}, {
    name: 'Last'
}];

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ endBeforeStart

const endBeforeStart = [{
    slackUserId: slackUsers[0].slackId,
    start: '2019-10-10',
    end: '2019-10-09'
}, {
    slackUserId: slackUsers[0].slackId,
    start: '2019-10-10',
    end: '2019-10-10',
    startPeriod: 'pm',
    endPeriod: 'am'
}];

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ validationError

const validationError = {
    start: '2019-12-10',
    end: '2019-12-13',
    startPeriod: 'pm',
    endPeriod: 'pm',
    comment: 'Random comment',
    fake: 'field'
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ filter

const filter = {
    start: {
        value: '2019-11-20',
        fct: (ds) => ds.filter((d) => d.end >= '2019-11-20')
    },
    end: {
        value: '2019-12-10',
        fct: (ds) => ds.filter((d) => d.end <= '2019-12-10')
    },
    slackUser: {
        value: `${[
            slackUsers[1].slackId,
            slackUsers[2].slackId
        ].join(',')}`,
        fct: (ds) => ds.filter((d) => [
            slackUsers[1].slackId,
            slackUsers[2].slackId
        ].includes(d.slackUser.slackId))
    },
    status: {
        value: 'confirmed',
        fct: (ds) => ds.filter((d) => d.confirmed === true)
    }
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ pages

const pages = [{
    page: 1,
    limit: 2
}, {
    page: 2,
    limit: 2
}, {
    page: 3,
    limit: 1
}, {
    page: 2,
    limit: 3
}];

//

module.exports = {
    slackUsers,
    createSlackUsers,
    slackChannels,
    createSlackChannels,
    dayoffTypes,
    endBeforeStart,
    validationError,
    filter,
    pages
};
