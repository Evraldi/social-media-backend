const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserProfileSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    full_name: {
        type: String
    },
    bio: {
        type: String
    },
    profile_picture_url: {
        type: String
    }
});

// Create indexes for frequently queried fields
// user is already indexed due to unique: true
UserProfileSchema.index({ full_name: 'text' }); // For text search on full name

module.exports = mongoose.model('UserProfile', UserProfileSchema);
