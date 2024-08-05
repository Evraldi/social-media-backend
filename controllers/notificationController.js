const { Notification, User } = require('../models');

const getNotifications = async (req, res) => {
    const { user_id } = req.params;

    try {
        const notifications = await Notification.findAll({ where: { user_id } });

        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            data: notifications
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

const createNotification = async (req, res) => {
    const { user_id, content } = req.body;

    try {
        const newNotification = await Notification.create({ user_id, content });

        res.status(201).json({
            success: true,
            message: "Notification created successfully",
            timestamp: new Date().toISOString(),
            data: newNotification
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

const createNotificationForAll = async (req, res) => {
    const { content } = req.body;

    try {
        const users = await User.findAll({ attributes: ['id'] });
        const notifications = users.map(user => ({ user_id: user.id, content }));

        const newNotifications = await Notification.bulkCreate(notifications);

        res.status(201).json({
            success: true,
            message: "Notifications created successfully for all users",
            timestamp: new Date().toISOString(),
            data: newNotifications
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

const markNotificationAsRead = async (req, res) => {
    const { id } = req.params;

    try {
        const notification = await Notification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
                timestamp: new Date().toISOString()
            });
        }

        notification.read = true;
        await notification.save();

        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            timestamp: new Date().toISOString(),
            data: notification
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

const deleteNotification = async (req, res) => {
    const { id } = req.params;

    try {
        const notification = await Notification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
                timestamp: new Date().toISOString()
            });
        }

        await notification.destroy();

        res.status(200).json({
            success: true,
            message: "Notification deleted successfully",
            timestamp: new Date().toISOString()
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

module.exports = {
    getNotifications,
    createNotification,
    createNotificationForAll,
    markNotificationAsRead,
    deleteNotification
};
