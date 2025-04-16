const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent',
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
MessageSchema.index({ sender: 1, receiver: 1 });
MessageSchema.index({ receiver: 1, sender: 1 }); // For conversation queries
MessageSchema.index({ receiver: 1, read: 1 });
MessageSchema.index({ created_at: -1 });

module.exports = mongoose.model('Message', MessageSchema);
