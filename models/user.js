const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Create index for sorting by creation date
// Note: username and email already have indexes from unique: true
UserSchema.index({ created_at: -1 });

module.exports = mongoose.model('User', UserSchema);
