const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/validationUtils');
const { paginationRules } = require('./userValidations');

/**
 * Notification validation rules
 */

// Get notifications validation rules
const getNotificationsRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    ...paginationRules,

    query('read')
        .optional()
        .isBoolean()
        .withMessage('Read status must be a boolean')
        .toBoolean(),

    query('type')
        .optional()
        .isIn(['follow', 'like', 'comment', 'message', 'friend_request', 'system', 'all'])
        .withMessage('Type must be one of: follow, like, comment, message, friend_request, system, all'),

    query('sort')
        .optional()
        .isIn(['created_at'])
        .withMessage('Sort must be: created_at'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be one of: asc, desc')
];

// Create notification validation rules
const createNotificationRules = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    body('type')
        .notEmpty()
        .withMessage('Type is required')
        .isIn(['follow', 'like', 'comment', 'message', 'friend_request', 'system'])
        .withMessage('Type must be one of: follow, like, comment, message, friend_request, system'),

    body('content')
        .notEmpty()
        .withMessage('Content is required')
        .isString()
        .withMessage('Content must be a string')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Content must be between 1 and 1000 characters')
        .trim(),

    body('reference_id')
        .optional()
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid reference ID format'),

    body('reference_type')
        .optional()
        .isIn(['post', 'comment', 'user', 'message', 'friendship'])
        .withMessage('Reference type must be one of: post, comment, user, message, friendship'),

    body('link')
        .optional()
        .isURL()
        .withMessage('Link must be a valid URL')
];

// Create notification for all users validation rules
const createNotificationForAllRules = [
    body('content')
        .notEmpty()
        .withMessage('Content is required')
        .isString()
        .withMessage('Content must be a string')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Content must be between 1 and 1000 characters')
        .trim(),

    body('type')
        .optional()
        .isIn(['system'])
        .withMessage('Type must be: system'),

    body('link')
        .optional()
        .isURL()
        .withMessage('Link must be a valid URL')
];

// Mark notification as read validation rules
const markNotificationAsReadRules = [
    param('id')
        .notEmpty()
        .withMessage('Notification ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid notification ID format')
];

// Mark all notifications as read validation rules
const markAllNotificationsAsReadRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format')
];

// Delete notification validation rules
const deleteNotificationRules = [
    param('id')
        .notEmpty()
        .withMessage('Notification ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid notification ID format')
];

// Get unread notification count validation rules
const getUnreadNotificationCountRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format')
];

module.exports = {
    getNotificationsRules,
    createNotificationRules,
    createNotificationForAllRules,
    markNotificationAsReadRules,
    markAllNotificationsAsReadRules,
    deleteNotificationRules,
    getUnreadNotificationCountRules
};
