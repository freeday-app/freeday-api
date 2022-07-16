const Mongoose = require('mongoose');

const jobEventSchema = Mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['edit', 'execution', 'failedExecution']
    },
    date: {
        type: Date,
        required: true
    }
}, {
    collection: 'jobevents',
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            delete ret._id;
        }
    }
});

module.exports = jobEventSchema;
