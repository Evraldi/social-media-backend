const { Message, User } = require('../models');
const { Op } = require('sequelize');

const sendMessage = async (req, res) => {
    const { sender_id, receiver_id, content } = req.body;

    try {
        if (!sender_id || !receiver_id || !content) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: sender_id, receiver_id, or content",
                timestamp: new Date().toISOString()
            });
        }

        const receiver = await User.findByPk(receiver_id);
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found",
                timestamp: new Date().toISOString()
            });
        }

        const sender = await User.findByPk(sender_id);
        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Sender not found",
                timestamp: new Date().toISOString()
            });
        }

        // Uncomment this if you want to prevent self-messaging
        // if (sender_id === receiver_id) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Sender and receiver cannot be the same",
        //         timestamp: new Date().toISOString()
        //     });
        // }

        const newMessage = await Message.create({ sender_id, receiver_id, content });
        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            timestamp: new Date().toISOString(),
            data: {
                id: newMessage.id,
                sender_id: newMessage.sender_id,
                receiver_id: newMessage.receiver_id,
                content: newMessage.content,
                created_at: newMessage.created_at
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const getMessages = async (req, res) => {
    const { sender_id, receiver_id } = req.params;

    try {
        if (!sender_id || !receiver_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: sender_id or receiver_id",
                timestamp: new Date().toISOString()
            });
        }

        const receiver = await User.findByPk(receiver_id);
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found",
                timestamp: new Date().toISOString()
            });
        }

        const sender = await User.findByPk(sender_id);
        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Sender not found",
                timestamp: new Date().toISOString()
            });
        }

        const messages = await Message.findAll({
            where: { sender_id, receiver_id },
            order: [['created_at', 'ASC']]
        });

        if (messages.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No messages found",
                timestamp: new Date().toISOString(),
                metadata: {
                    sender_id,
                    receiver_id,
                    message_count: 0
                }
            });
        }

        res.status(200).json({
            success: true,
            message: "Messages retrieved successfully",
            timestamp: new Date().toISOString(),
            metadata: {
                sender_id,
                receiver_id,
                message_count: messages.length
            },
            data: messages.map(msg => ({
                id: msg.id,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                content: msg.content,
                created_at: msg.created_at,
                status: msg.status
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const getConversation = async (req, res) => {
    const { sender_id, receiver_id } = req.params;

    try {
        if (!sender_id || !receiver_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: sender_id or receiver_id",
                timestamp: new Date().toISOString()
            });
        }

        const receiver = await User.findByPk(receiver_id);
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found",
                timestamp: new Date().toISOString()
            });
        }

        const sender = await User.findByPk(sender_id);
        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Sender not found",
                timestamp: new Date().toISOString()
            });
        }

        const conversation = await Message.findAll({
            where: {
                [Op.or]: [
                    { sender_id, receiver_id },
                    { sender_id: receiver_id, receiver_id: sender_id }
                ]
            },
            order: [['created_at', 'ASC']]
        });

        if (conversation.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No conversation found",
                timestamp: new Date().toISOString(),
                metadata: {
                    sender_id,
                    receiver_id,
                    message_count: 0
                }
            });
        }

        res.status(200).json({
            success: true,
            message: "Conversation retrieved successfully",
            timestamp: new Date().toISOString(),
            metadata: {
                sender_id,
                receiver_id,
                message_count: conversation.length
            },
            data: conversation.map(msg => ({
                id: msg.id,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                content: msg.content,
                created_at: msg.created_at,
                status: msg.status
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const updateMessage = async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    try {
        if (!content) {
            return res.status(400).json({
                success: false,
                message: "Content field is required",
                timestamp: new Date().toISOString()
            });
        }

        const message = await Message.findByPk(id);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
                timestamp: new Date().toISOString()
            });
        }

        message.content = content;
        await message.save();

        res.status(200).json({
            success: true,
            message: "Message updated successfully",
            timestamp: new Date().toISOString(),
            data: {
                id: message.id,
                sender_id: message.sender_id,
                receiver_id: message.receiver_id,
                content: message.content,
                created_at: message.created_at,
                status: message.status,
                updated_at: message.updated_at
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const updateMessageStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status field is required",
                timestamp: new Date().toISOString()
            });
        }

        const message = await Message.findByPk(id);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
                timestamp: new Date().toISOString()
            });
        }

        message.status = status;
        await message.save();

        res.status(200).json({
            success: true,
            message: "Message status updated successfully",
            timestamp: new Date().toISOString(),
            data: {
                id: message.id,
                sender_id: message.sender_id,
                receiver_id: message.receiver_id,
                content: message.content,
                status: message.status,
                updated_at: message.updated_at
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const deleteMessage = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Message.destroy({ where: { id } });
        if (result) {
            res.status(200).json({
                success: true,
                message: "Message deleted successfully",
                timestamp: new Date().toISOString(),
                data: { id }
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Message not found",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    getConversation,
    updateMessage,
    updateMessageStatus,
    deleteMessage
};
