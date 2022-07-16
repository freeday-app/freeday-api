const Mongoose = require('mongoose');

const jobSchema = Mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean
    },
    hour: {
        type: String
    },
    minute: {
        type: String
    },
    dayOfMonth: {
        type: String
    }
}, {
    collection: 'jobs',
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            delete ret._id;
        }
    }
});

module.exports = jobSchema;
