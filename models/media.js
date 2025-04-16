const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MediaSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    },
    media_url: {
        type: String,
        required: true
    },
    media_type: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for frequently queried fields
MediaSchema.index({ user: 1 }); // For finding media by user
MediaSchema.index({ post: 1 }); // For finding media by post
MediaSchema.index({ media_type: 1 }); // For filtering by media type
MediaSchema.index({ created_at: -1 }); // For sorting by creation date

module.exports = mongoose.model('Media', MediaSchema);
