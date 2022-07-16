const Mongoose = require('mongoose');

const configurationSchema = Mongoose.Schema({
    brandingName: {
        type: String
    },
    brandingLogo: {
        type: String
    },
    slackReferrer: {
        type: String
    },
    workDays: {
        type: [Number],
        required: true,
        validate: {
            validator: (val) => val.reduce((acc, v) => (acc && v >= 0 && v <= 6), true),
            message: '{VALUE} must contain only numbers between 0 and 6'
        }
    }
}, {
    collection: 'configuration',
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            delete ret._id;
        }
    }
});

module.exports = configurationSchema;
