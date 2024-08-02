const { Notification, User } = require('../models');

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

const createNotificationForAll = async (req, res) => {
    const { content } = req.body;
    try {
        const users = await User.findAll({ attributes: ['id'] });
        const notifications = users.map(user => ({ user_id: user.id, content }));

        const newNotifications = await Notification.bulkCreate(notifications);
        res.status(201).json({
            success: true,
            message: "Notifications created successfully for all users",
            data: newNotifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create notifications for all users",
            error: error.message
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
                message: "Notification not found"
            });
        }

        notification.read = true;
        await notification.save();

        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
            error: error.message
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
                message: "Notification not found"
            });
        }

        await notification.destroy();

        res.status(200).json({
            success: true,
            message: "Notification deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete notification",
            error: error.message
        });
    }
};

module.exports = { getNotifications, createNotification, createNotificationForAll, markNotificationAsRead, deleteNotification };