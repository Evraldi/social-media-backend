const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String
    },
    image_url: {
        type: String
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    likes_count: {
        type: Number,
        default: 0
    },
    comments_count: {
        type: Number,
        default: 0
    }
});

// Create indexes for frequently queried fields
PostSchema.index({ user: 1 });
PostSchema.index({ created_at: -1 });
PostSchema.index({ visibility: 1 });
PostSchema.index({ likes_count: -1 });
PostSchema.index({ comments_count: -1 });

module.exports = mongoose.model('Post', PostSchema);
