const { Notification, User } = require('../models');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

/**
 * Get notifications for a user by user_id
 * @route GET /api/users/:user_id/notifications
 */
const getNotificationsByUserId = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
        throw new NotFoundError("User not found");
    }

    // Get total count for pagination
    const totalNotifications = await Notification.countDocuments({ user: user_id });

    // Get paginated notifications
    const notifications = await Notification.find({ user: user_id })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        timestamp: new Date().toISOString(),
        data: notifications,
        pagination: getPaginationMetadata(totalNotifications, page, limit)
    });
});

/**
 * Get notifications for the authenticated user
 * @route GET /api/notifications
 */
const getNotifications = asyncHandler(async (req, res) => {
    const user_id = req.user._id;
    const { read } = req.query;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Build query
    const query = { user: user_id };

    // Filter by read status if provided
    if (read !== undefined) {
        query.read = read === 'true' || read === true;
    }

    // Get total count for pagination
    const totalNotifications = await Notification.countDocuments(query);

    // Get paginated notifications
    const notifications = await Notification.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        timestamp: new Date().toISOString(),
        data: notifications,
        pagination: getPaginationMetadata(totalNotifications, page, limit)
    });
});

/**
 * Get unread notification count for the authenticated user
 * @route GET /api/notifications/unread/count
 */
const getUnreadNotificationCount = asyncHandler(async (req, res) => {
    const user_id = req.user._id;

    // Count unread notifications
    const count = await Notification.countDocuments({ user: user_id, read: false });

    res.status(200).json({
        success: true,
        message: "Unread notification count retrieved successfully",
        timestamp: new Date().toISOString(),
        data: { count }
    });
});

/**
 * Create a notification for a user
 * @route POST /api/notifications
 */
const createNotification = asyncHandler(async (req, res) => {
    const { user_id, type, content } = req.body;
    const sender_id = req.body.sender_id || req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
        throw new NotFoundError("User not found");
    }

    // Create notification
    const newNotification = new Notification({
        user: user_id,
        sender: sender_id,
        type: type || 'system',
        content,
        created_at: new Date()
    });

    await newNotification.save();

    res.status(201).json({
        success: true,
        message: "Notification created successfully",
        timestamp: new Date().toISOString(),
        data: newNotification
    });
});

/**
 * Create notifications for all users
 * @route POST /api/notifications/all
 */
const createNotificationForAll = asyncHandler(async (req, res) => {
    const { content } = req.body;

    // Get all users
    const users = await User.find().select('_id');

    // Create notification objects for all users
    const notificationObjects = users.map(user => ({
        user: user._id,
        content
    }));

    // Insert many notifications at once
    const newNotifications = await Notification.insertMany(notificationObjects);

    res.status(201).json({
        success: true,
        message: "Notifications created successfully for all users",
        timestamp: new Date().toISOString(),
        data: {
            count: newNotifications.length,
            sample: newNotifications.slice(0, 5) // Return just a sample to avoid large response
        }
    });
});

/**
 * Mark a notification as read
 * @route PUT /api/notifications/:id/read
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user_id = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid notification ID format");
    }

    // Find notification
    const notification = await Notification.findById(id);

    if (!notification) {
        throw new NotFoundError("Notification not found");
    }

    // Check if user is authorized to mark this notification as read
    if (notification.user.toString() !== user_id.toString()) {
        throw new ForbiddenError("You are not authorized to mark this notification as read");
    }

    // Update notification
    notification.read = true;
    await notification.save();

    res.status(200).json({
        success: true,
        message: "Notification marked as read",
        timestamp: new Date().toISOString(),
        data: notification
    });
});

/**
 * Mark all notifications as read for the authenticated user
 * @route PUT /api/notifications/read/all
 */
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const user_id = req.user._id;

    // Update all unread notifications for the user
    const result = await Notification.updateMany(
        { user: user_id, read: false },
        { $set: { read: true } }
    );

    res.status(200).json({
        success: true,
        message: "All notifications marked as read",
        timestamp: new Date().toISOString(),
        data: { count: result.modifiedCount }
    });
});

/**
 * Delete a notification
 * @route DELETE /api/notifications/:id
 */
const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user_id = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid notification ID format");
    }

    // Find notification
    const notification = await Notification.findById(id);

    if (!notification) {
        throw new NotFoundError("Notification not found");
    }

    // Check if user is authorized to delete this notification
    if (notification.user.toString() !== user_id.toString()) {
        throw new ForbiddenError("You are not authorized to delete this notification");
    }

    // Delete notification
    await Notification.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Notification deleted successfully",
        timestamp: new Date().toISOString()
    });
});

module.exports = {
    getNotifications,
    getNotificationsByUserId,
    getUnreadNotificationCount,
    createNotification,
    createNotificationForAll,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
};
