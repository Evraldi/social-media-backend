const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/validationUtils');
const { paginationRules, searchRules } = require('./userValidations');

/**
 * Follower validation rules
 */

// Get followers validation rules
const getFollowersRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    ...paginationRules,
    ...searchRules,

    query('sort')
        .optional()
        .isIn(['username', 'created_at'])
        .withMessage('Sort must be one of: username, created_at'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be one of: asc, desc')
];

// Get following validation rules
const getFollowingRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    ...paginationRules,
    ...searchRules,

    query('sort')
        .optional()
        .isIn(['username', 'created_at'])
        .withMessage('Sort must be one of: username, created_at'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be one of: asc, desc')
];

// Follow user validation rules
const followUserRules = [
    body('following_id')
        .notEmpty()
        .withMessage('Following ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid following ID format')
        .custom((value, { req }) => {
            // User ID is now taken from the authenticated user
            if (req.user && req.user.id === value) {
                throw new Error('Users cannot follow themselves');
            }
            return true;
        })
];

// Unfollow user validation rules
const unfollowUserRules = [
    param('following_id')
        .notEmpty()
        .withMessage('Following ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid following ID format')
];

// Check if user is following another user validation rules
const checkFollowingStatusRules = [
    param('following_id')
        .notEmpty()
        .withMessage('Following ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid following ID format')
];

// Get follower count validation rules
const getFollowerCountRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format')
];

// Get following count validation rules
const getFollowingCountRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format')
];

module.exports = {
    getFollowersRules,
    getFollowingRules,
    followUserRules,
    unfollowUserRules,
    checkFollowingStatusRules,
    getFollowerCountRules,
    getFollowingCountRules
};
