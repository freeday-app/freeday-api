const Mongoose = require('mongoose');

const dayoffTypeSchema = Mongoose.Schema({
    name: {
        type: String
    },
    emoji: {
        type: String
    },
    enabled: {
        type: Boolean
    },
    displayed: {
        type: Boolean
    },
    important: {
        type: Boolean
    }
}, {
    collection: 'dayofftypes',
    versionKey: false,
    toJSON: {
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

module.exports = dayoffTypeSchema;
