const { Message } = require('../models');

const sendMessage = async (req, res) => {
    const { sender_id, receiver_id, content } = req.body;
    try {
        const newMessage = await Message.create({ sender_id, receiver_id, content });
        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: newMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to send message",
            error: error.message
        });
    }
};

const getMessages = async (req, res) => {
    const { sender_id, receiver_id } = req.params;
    try {
        const messages = await Message.findAll({
            where: { sender_id, receiver_id }
        });
        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve messages",
            error: error.message
        });
    }
};

module.exports = { sendMessage, getMessages };
