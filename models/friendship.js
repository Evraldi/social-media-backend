const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FriendshipSchema = new Schema({
    requester: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for frequently queried fields
// Compound index to ensure uniqueness of friendship requests
FriendshipSchema.index({ requester: 1, receiver: 1 }, { unique: true });

// Additional indexes for common queries
FriendshipSchema.index({ requester: 1, status: 1 }); // For finding friend requests sent by a user
FriendshipSchema.index({ receiver: 1, status: 1 }); // For finding friend requests received by a user
FriendshipSchema.index({ status: 1 }); // For filtering by status
FriendshipSchema.index({ created_at: -1 }); // For sorting by creation date

module.exports = mongoose.model('Friendship', FriendshipSchema);
