const Mongoose = require('mongoose');

const slackAuthSchema = Mongoose.Schema({
    accessToken: {
        type: String,
        validate: {
            validator: (val) => val === null || (val.length > 5 && val.startsWith('xoxb-')),
            message: '{VALUE} must have length above 5 and must start with "xoxb-"'
        }
    },
    teamId: {
        type: String
    },
    state: {
        type: String
    }
}, {
    collection: 'slackauth',
    versionKey: false,
    toJSON: {
        transform(doc, ret) {
            delete ret._id;
        }
    }
});

module.exports = slackAuthSchema;
