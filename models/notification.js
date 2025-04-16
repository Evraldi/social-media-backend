const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['follow', 'like', 'comment', 'message', 'friend_request', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for frequently queried fields
NotificationSchema.index({ user: 1, read: 1 }); // For finding unread notifications for a user
NotificationSchema.index({ user: 1, type: 1 }); // For filtering notifications by type
NotificationSchema.index({ user: 1, created_at: -1 }); // For sorting notifications by date
NotificationSchema.index({ sender: 1 }); // For finding notifications from a specific sender

module.exports = mongoose.model('Notification', NotificationSchema);
