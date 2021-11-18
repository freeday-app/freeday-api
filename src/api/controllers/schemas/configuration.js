module.exports = {

    upsert: {
        brandingName: {
            in: 'body',
            type: 'String',
            optional: true,
            allowNull: true
        },
        brandingLogo: {
            in: 'body',
            type: 'Base64',
            optional: true,
            allowNull: true
        },
        slackReferrer: {
            in: 'body',
            type: 'SlackId',
            optional: true,
            allowNull: true
        },
        workDays: {
            in: 'body',
            type: 'Number',
            values: [0, 1, 2, 3, 4, 5, 6],
            acceptArray: true,
            optional: true
        }
    }

};
