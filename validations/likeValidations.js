const { param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/validationUtils');
const { paginationRules } = require('./userValidations');

/**
 * Like validation rules
 */

// Get likes by post ID validation rules
const getLikesRules = [
    param('post_id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format'),

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

// Create like validation rules
const createLikeRules = [
    param('post_id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format')
];

// Delete like validation rules
const deleteLikeRules = [
    param('post_id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format')
];

// Check if user liked a post validation rules
const checkLikeRules = [
    param('post_id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format')
];

// Get users who liked a post validation rules
const getLikedUsersRules = [
    param('post_id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format'),

    ...paginationRules
];

module.exports = {
    getLikesRules,
    createLikeRules,
    deleteLikeRules,
    checkLikeRules,
    getLikedUsersRules
};
