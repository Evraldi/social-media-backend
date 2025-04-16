const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LikeSchema = new Schema({
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    user: {
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
// Compound index to ensure a user can't like a post more than once
LikeSchema.index({ post: 1, user: 1 }, { unique: true });

// Additional indexes for common queries
LikeSchema.index({ post: 1 }); // For counting likes on a post
LikeSchema.index({ user: 1 }); // For finding posts liked by a user
LikeSchema.index({ created_at: -1 }); // For sorting by creation date

module.exports = mongoose.model('Like', LikeSchema);
