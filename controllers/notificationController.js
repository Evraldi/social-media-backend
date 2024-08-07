const { Notification, User } = require('../models');

const paginate = (query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    return { limit, offset };
};

const getNotifications = async (req, res) => {
    const { user_id } = req.params;
    const { limit, offset } = paginate(req.query);

    try {
        const { count, rows } = await Notification.findAndCountAll({
            where: { user_id },
            limit,
            offset
        });

        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            data: rows,
            meta: {
                total: count,
                page: parseInt(req.query.page, 10) || 1,
                totalPages: Math.ceil(count / limit),
                perPage: limit
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

        // Optional: Batch creation to prevent overwhelming the database
        const newNotifications = await Notification.bulkCreate(notifications, { individualHooks: true });

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
