const { Message, User } = require('../models');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

/**
 * Send a message
 * @route POST /api/messages
 */
const sendMessage = asyncHandler(async (req, res) => {
    const { receiver, content } = req.body;
    const sender = req.user._id;

    // Validate required fields
    if (!content) {
        throw new BadRequestError("Missing required field: content");
    }

    if (!receiver) {
        throw new BadRequestError("Missing required field: receiver");
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(receiver)) {
        throw new BadRequestError("Invalid receiver ID format");
    }

    // Check if receiver exists
    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
        throw new NotFoundError("User not found");
    }

    // Prevent self-messaging
    if (sender.toString() === receiver) {
        throw new BadRequestError("You cannot send messages to yourself");
    }

    // Create new message
    const newMessage = new Message({
        sender: sender,
        receiver: receiver,
        content,
        status: 'sent',
        read: false,
        created_at: new Date()
    });

    await newMessage.save();

    res.status(201).json({
        success: true,
        message: "Message sent successfully",
        timestamp: new Date().toISOString(),
        data: newMessage
    });
});

/**
 * Get all conversations for the authenticated user
 * @route GET /api/messages/conversations
 */
const getConversations = asyncHandler(async (req, res) => {
    const user_id = req.user._id;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Convert to ObjectId for better performance
    const userObjectId = new mongoose.Types.ObjectId(user_id);

    // Get total count of conversations first (for accurate pagination)
    const totalConversationsCount = await Message.aggregate([
        // Find all messages where the user is either sender or receiver
        { $match: { $or: [{ sender: userObjectId }, { receiver: userObjectId }] } },

        // Group by the conversation partner
        { $group: {
            _id: {
                $cond: [
                    { $eq: ["$sender", userObjectId] },
                    "$receiver",
                    "$sender"
                ]
            }
        }},

        // Count the number of unique conversation partners
        { $count: "total" }
    ]).then(result => result.length > 0 ? result[0].total : 0);

    // Find all unique conversations involving the user with optimized pipeline
    const conversations = await Message.aggregate([
        // Find all messages where the user is either sender or receiver
        { $match: { $or: [{ sender: userObjectId }, { receiver: userObjectId }] } },

        // Sort by created_at descending to get the most recent messages first
        { $sort: { created_at: -1 } },

        // Group by the conversation partner and keep only the most recent message
        { $group: {
            _id: {
                $cond: [
                    { $eq: ["$sender", userObjectId] },
                    "$receiver",
                    "$sender"
                ]
            },
            lastMessage: { $first: "$$ROOT" },
            unreadCount: {
                $sum: {
                    $cond: [
                        { $and: [
                            { $eq: ["$receiver", userObjectId] },
                            { $eq: ["$read", false] }
                        ]},
                        1,
                        0
                    ]
                }
            }
        }},

        // Lookup user details with projection to limit fields
        { $lookup: {
            from: "users",
            let: { userId: "$_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
                { $project: { _id: 1, username: 1 } }
            ],
            as: "user"
        }},

        // Unwind the user array
        { $unwind: "$user" },

        // Project only the fields we need
        { $project: {
            user: 1,
            unreadCount: 1,
            lastMessage: {
                _id: 1,
                content: 1,
                sender: 1,
                receiver: 1,
                status: 1,
                created_at: 1
            }
        }},

        // Skip and limit for pagination
        { $skip: skip },
        { $limit: limit }
    ]);

    res.status(200).json({
        success: true,
        message: "Conversations retrieved successfully",
        timestamp: new Date().toISOString(),
        data: conversations,
        pagination: getPaginationMetadata(totalConversationsCount, page, limit)
    });
});

/**
 * Get messages between the authenticated user and another user
 * @route GET /api/messages/:user_id
 */
const getMessages = asyncHandler(async (req, res) => {
    const sender_id = req.user._id;
    const receiver_id = req.params.user_id;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(receiver_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Convert string IDs to ObjectIds for better performance
    const senderObjectId = new mongoose.Types.ObjectId(sender_id);
    const receiverObjectId = new mongoose.Types.ObjectId(receiver_id);

    // Define projection to limit returned fields
    const projection = {
        content: 1,
        sender: 1,
        receiver: 1,
        status: 1,
        read: 1,
        created_at: 1
    };

    // Create query once to reuse
    const query = {
        $or: [
            { sender: senderObjectId, receiver: receiverObjectId },
            { sender: receiverObjectId, receiver: senderObjectId }
        ]
    };

    // Use Promise.all to run queries in parallel
    const [user, totalMessages, messages] = await Promise.all([
        // Check if user exists with minimal projection
        User.findById(receiverObjectId).select('_id username').lean(),

        // Get total count for pagination
        Message.countDocuments(query),

        // Get messages with pagination and optimized query
        Message.find(query, projection)
            .sort({ created_at: 1 }) // ASC order
            .skip(skip)
            .limit(limit)
            .lean() // Convert to plain JS objects for better performance
    ]);

    if (!user) {
        throw new NotFoundError("User not found");
    }

    // Mark messages as read in background (don't await to improve response time)
    Message.updateMany(
        { sender: receiverObjectId, receiver: senderObjectId, read: false },
        { $set: { read: true, status: 'read' } }
    ).then(() => {
        console.log(`Marked messages as read for conversation between ${sender_id} and ${receiver_id}`);
    }).catch(err => {
        console.error('Error marking messages as read:', err);
    });

    if (messages.length === 0) {
        return res.status(200).json({
            success: true,
            message: "No messages found",
            timestamp: new Date().toISOString(),
            metadata: {
                user: receiver_id,
                message_count: 0
            },
            data: [],
            pagination: getPaginationMetadata(0, page, limit)
        });
    }

    res.status(200).json({
        success: true,
        message: "Messages retrieved successfully",
        timestamp: new Date().toISOString(),
        metadata: {
            user: receiver_id,
            message_count: messages.length
        },
        data: messages,
        pagination: getPaginationMetadata(totalMessages, page, limit)
    });
});

/**
 * Get conversation between two users (deprecated - use getMessages instead)
 * @route GET /api/messages/conversation/:sender_id/:receiver_id
 */
const getConversation = asyncHandler(async (req, res) => {
    const { sender_id, receiver_id } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Validate required parameters
    if (!sender_id || !receiver_id) {
        throw new BadRequestError("Missing required parameters: sender_id or receiver_id");
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(sender_id) || !mongoose.Types.ObjectId.isValid(receiver_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Check if receiver exists
    const receiver = await User.findById(receiver_id);
    if (!receiver) {
        throw new NotFoundError("Receiver not found");
    }

    // Check if sender exists
    const sender = await User.findById(sender_id);
    if (!sender) {
        throw new NotFoundError("Sender not found");
    }

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({
        $or: [
            { sender: sender_id, receiver: receiver_id },
            { sender: receiver_id, receiver: sender_id }
        ]
    });

    // Get conversation with pagination
    const conversation = await Message.find({
        $or: [
            { sender: sender_id, receiver: receiver_id },
            { sender: receiver_id, receiver: sender_id }
        ]
    })
        .sort({ created_at: 1 }) // ASC order
        .skip(skip)
        .limit(limit);

    if (conversation.length === 0) {
        return res.status(200).json({
            success: true,
            message: "No conversation found",
            timestamp: new Date().toISOString(),
            metadata: {
                sender: sender_id,
                receiver: receiver_id,
                message_count: 0
            },
            data: [],
            pagination: getPaginationMetadata(0, page, limit)
        });
    }

    res.status(200).json({
        success: true,
        message: "Conversation retrieved successfully",
        timestamp: new Date().toISOString(),
        metadata: {
            sender: sender_id,
            receiver: receiver_id,
            message_count: totalMessages
        },
        data: conversation,
        pagination: getPaginationMetadata(totalMessages, page, limit)
    });
});

/**
 * Update a message
 * @route PUT /api/messages/:id
 */
const updateMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content) {
        throw new BadRequestError("Content field is required");
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid message ID format");
    }

    // Find and update message
    const message = await Message.findByIdAndUpdate(
        id,
        { content },
        { new: true, runValidators: true }
    );

    if (!message) {
        throw new NotFoundError("Message not found");
    }

    res.status(200).json({
        success: true,
        message: "Message updated successfully",
        timestamp: new Date().toISOString(),
        data: message
    });
});

/**
 * Update message status
 * @route PUT /api/messages/:id/status
 */
const updateMessageStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['sent', 'delivered', 'read'].includes(status)) {
        throw new BadRequestError("Valid status field is required (sent, delivered, or read)");
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid message ID format");
    }

    // Find and update message status
    const message = await Message.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
    );

    if (!message) {
        throw new NotFoundError("Message not found");
    }

    res.status(200).json({
        success: true,
        message: "Message status updated successfully",
        timestamp: new Date().toISOString(),
        data: message
    });
});

/**
 * Delete a message
 * @route DELETE /api/messages/:id
 */
const deleteMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid message ID format");
    }

    // First find the message to check authorization
    const message = await Message.findById(id);

    if (!message) {
        throw new NotFoundError("Message not found");
    }

    // Check if user is authorized to delete this message
    // Only the sender can delete a message
    if (message.sender.toString() !== req.user._id.toString()) {
        throw new ForbiddenError("You are not authorized to delete this message");
    }

    // Now delete the message
    await Message.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Message deleted successfully",
        timestamp: new Date().toISOString(),
        data: { id }
    });
});

module.exports = {
    sendMessage,
    getMessages,
    getConversations,
    getConversation,
    updateMessage,
    updateMessageStatus,
    deleteMessage
};
