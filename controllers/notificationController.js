const { Notification } = require('../models');

const getNotifications = async (req, res) => {
    const { user_id } = req.params;
    try {
        const notifications = await Notification.findAll({
            where: { user_id }
        });
        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve notifications",
            error: error.message
        });
    }
};

const createNotification = async (req, res) => {
    const { user_id, content } = req.body;
    try {
        const newNotification = await Notification.create({ user_id, content });
        res.status(201).json({
            success: true,
            message: "Notification created successfully",
            data: newNotification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create notification",
            error: error.message
        });
    }
};

module.exports = { getNotifications, createNotification };
