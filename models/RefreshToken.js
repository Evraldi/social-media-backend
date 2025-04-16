const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RefreshTokenSchema = new Schema({
    token: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Create indexes for frequently queried fields
RefreshTokenSchema.index({ token: 1 }); // For token lookups during refresh
RefreshTokenSchema.index({ user: 1 }); // For finding tokens by user
RefreshTokenSchema.index({ createdAt: 1 }); // For token expiration cleanup

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
