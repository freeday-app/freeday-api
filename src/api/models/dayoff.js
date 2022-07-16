const Mongoose = require('mongoose');

const SlackUser = require('./slackUser.js');

const slackUserSchema = JSON.parse(JSON.stringify(SlackUser.obj));
delete slackUserSchema.slackId.unique;

const DayoffType = require('./dayoffType.js');

const dayoffSchema = Mongoose.Schema({
    canceled: {
        type: Boolean
    },
    confirmed: {
        type: Boolean
    },
    count: {
        type: Number
    },
    created: {
        type: Date
    },
    updated: {
        type: Date
    },
    days: {
        type: [Date]
    },
    end: {
        type: Date
    },
    endPeriod: {
        type: String
    },
    start: {
        type: Date
    },
    startPeriod: {
        type: String
    },
    type: DayoffType,
    slackUser: slackUserSchema,
    comment: {
        type: String
    },
    cancelReason: {
        type: String
    }
}, {
    collection: 'daysoff',
    versionKey: false,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        }
    },
    collation: {
        locale: 'fr',
        strength: 2
    }
});

dayoffSchema.index({
    'type._id': 1,
    'slackUser.slackId': 1
});

module.exports = dayoffSchema;
