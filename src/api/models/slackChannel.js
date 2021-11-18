const Mongoose = require('mongoose');

const slackChannelSchema = Mongoose.Schema({
    slackId: {
        type: String,
        unique: true
    },
    name: {
        type: String
    },
    isChannel: {
        type: Boolean
    },
    isGroup: {
        type: Boolean
    },
    isIm: {
        type: Boolean
    },
    isMpIm: {
        type: Boolean
    },
    isMember: {
        type: Boolean
    },
    isPrivate: {
        type: Boolean
    },
    archived: {
        type: Boolean
    }
}, {
    collection: 'slackchannels',
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

slackChannelSchema.index({
    slackId: 1
});

module.exports = slackChannelSchema;
