const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowerSchema = new Schema({
    follower: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    following: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for frequently queried fields
// Compound index to ensure a user can't follow another user more than once
FollowerSchema.index({ follower: 1, following: 1 }, { unique: true });

// Additional indexes for common queries
FollowerSchema.index({ follower: 1 }); // For finding who a user follows
FollowerSchema.index({ following: 1 }); // For finding followers of a user
FollowerSchema.index({ created_at: -1 }); // For sorting by creation date

module.exports = mongoose.model('Follower', FollowerSchema);
