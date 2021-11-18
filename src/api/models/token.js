const Mongoose = require('mongoose');

const Tools = require('../../services/tools.js');

const tokenSchema = Mongoose.Schema({
    limit: {
        type: Date,
        required: () => (
            this.limit === null || this.limit instanceof Date
        ),
        validate: {
            validator: (val) => val === null || val > Date.now(),
            message: '{VALUE} must be greater than now'
        }
    },
    token: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: (val) => val.length === 32,
            message: '{VALUE} must be 32 chars long'
        }
    },
    userId: {
        type: Mongoose.Schema.Types.ObjectId,
        required: () => (
            this.userId === null || Tools.isMongoId(this.userId)
        ),
        unique: true,
        sparse: true
    },
    initialization: {
        type: Boolean,
        default: false
    }
}, {
    collection: 'tokens',
    versionKey: false,
    toJSON: {
        transform(doc, ret) {
            delete ret.initialization;
            delete ret._id;
        }
    },
    collation: {
        locale: 'fr',
        strength: 2
    }
});

tokenSchema.index({
    token: 1
});

module.exports = tokenSchema;
