const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/validationUtils');
const { paginationRules } = require('./userValidations');

/**
 * Message validation rules
 */

// Send message validation rules
const sendMessageRules = [
    body('receiver')
        .notEmpty()
        .withMessage('Receiver is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid receiver ID format'),

    body('content')
        .notEmpty()
        .withMessage('Content is required')
        .isString()
        .withMessage('Content must be a string')
        .isLength({ min: 1, max: 5000 })
        .withMessage('Content must be between 1 and 5000 characters')
        .trim(),

    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),

    body('attachments.*.url')
        .optional()
        .isURL()
        .withMessage('Attachment URL must be a valid URL'),

    body('attachments.*.type')
        .optional()
        .isIn(['image', 'video', 'audio', 'document'])
        .withMessage('Attachment type must be one of: image, video, audio, document')
];

// Get messages validation rules
const getMessagesRules = [
    query('sender_id')
        .notEmpty()
        .withMessage('Sender ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid sender ID format'),

    query('receiver_id')
        .notEmpty()
        .withMessage('Receiver ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid receiver ID format'),

    ...paginationRules,

    query('sort')
        .optional()
        .isIn(['created_at'])
        .withMessage('Sort must be: created_at'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be one of: asc, desc')
];

// Get conversation validation rules
const getConversationRules = [
    param('sender_id')
        .notEmpty()
        .withMessage('Sender ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid sender ID format'),

    param('receiver_id')
        .notEmpty()
        .withMessage('Receiver ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid receiver ID format'),

    ...paginationRules
];

// Get conversations list validation rules
const getConversationsListRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    ...paginationRules
];

// Update message validation rules
const updateMessageRules = [
    param('id')
        .notEmpty()
        .withMessage('Message ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid message ID format'),

    body('content')
        .notEmpty()
        .withMessage('Content is required')
        .isString()
        .withMessage('Content must be a string')
        .isLength({ min: 1, max: 5000 })
        .withMessage('Content must be between 1 and 5000 characters')
        .trim()
];

// Update message status validation rules
const updateMessageStatusRules = [
    param('id')
        .notEmpty()
        .withMessage('Message ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid message ID format'),

    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['sent', 'delivered', 'read'])
        .withMessage('Status must be one of: sent, delivered, read')
];

// Delete message validation rules
const deleteMessageRules = [
    param('id')
        .notEmpty()
        .withMessage('Message ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid message ID format')
];

// Mark conversation as read validation rules
const markConversationAsReadRules = [
    param('sender_id')
        .notEmpty()
        .withMessage('Sender ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid sender ID format'),

    param('receiver_id')
        .notEmpty()
        .withMessage('Receiver ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid receiver ID format')
];

module.exports = {
    sendMessageRules,
    getMessagesRules,
    getConversationRules,
    getConversationsListRules,
    updateMessageRules,
    updateMessageStatusRules,
    deleteMessageRules,
    markConversationAsReadRules
};
