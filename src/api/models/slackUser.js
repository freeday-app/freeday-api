const Mongoose = require('mongoose');

const slackUserSchema = Mongoose.Schema({
    slackId: {
        type: String,
        unique: true
    },
    name: {
        type: String
    },
    avatar: {
        type: String
    },
    locale: {
        type: String
    },
    forcedLocale: {
        type: String
    },
    deleted: {
        type: Boolean
    }
}, {
    collection: 'slackusers',
    versionKey: false,
    toJSON: {
        transform(doc, ret) {
            delete ret._id;
        }
    },
    collation: {
        locale: 'fr',
        strength: 2
    }
});

slackUserSchema.index({
    slackId: 1
});

module.exports = slackUserSchema;
