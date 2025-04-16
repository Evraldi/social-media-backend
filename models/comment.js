const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
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
    content: {
        type: String,
        required: true
    },
    parent_id: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    likes_count: {
        type: Number,
        default: 0
    }
});

// Create indexes for frequently queried fields
CommentSchema.index({ post: 1 });
CommentSchema.index({ user: 1 });
CommentSchema.index({ parent_id: 1 });
CommentSchema.index({ created_at: -1 });

module.exports = mongoose.model('Comment', CommentSchema);
