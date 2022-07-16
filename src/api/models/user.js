const Mongoose = require('mongoose');

const userSchema = Mongoose.Schema({
    language: {
        type: String
    },
    theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
    },
    password: {
        type: String,
        required: true,
        validate: {
            validator: (val) => val.length !== '',
            message: "{VALUE} can't be empty"
        }
    },
    username: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: (val) => val.length >= 6,
            message: '{VALUE} must be at least 6 chars long'
        }
    }
}, {
    collection: 'users',
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.password;
        }
    },
    collation: {
        locale: 'fr',
        strength: 2
    }
});

userSchema.index({
    username: 1
});

module.exports = userSchema;
