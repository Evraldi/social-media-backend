const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/validationUtils');
const { paginationRules, searchRules } = require('./userValidations');

/**
 * Friendship validation rules
 */

// Get friend requests validation rules
const getFriendRequestsRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    ...paginationRules,
    ...searchRules,

    query('status')
        .optional()
        .isIn(['pending', 'accepted', 'rejected', 'all'])
        .withMessage('Status must be one of: pending, accepted, rejected, all'),

    query('direction')
        .optional()
        .isIn(['sent', 'received', 'all'])
        .withMessage('Direction must be one of: sent, received, all')
];

// Get friends validation rules
const getFriendsRules = [
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

// Send friend request validation rules
const sendFriendRequestRules = [
    body('receiver_id')
        .notEmpty()
        .withMessage('Receiver ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid receiver ID format')
        .custom((value, { req }) => {
            // User ID is now taken from the authenticated user
            if (req.user && req.user.id === value) {
                throw new Error('Users cannot send friend requests to themselves');
            }
            return true;
        })
];

// Accept friend request validation rules
const acceptFriendRequestRules = [
    param('id')
        .notEmpty()
        .withMessage('Friendship ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid friendship ID format')
];

// Reject friend request validation rules
const rejectFriendRequestRules = [
    param('id')
        .notEmpty()
        .withMessage('Friendship ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid friendship ID format')
];

// Cancel friend request validation rules
const cancelFriendRequestRules = [
    param('id')
        .notEmpty()
        .withMessage('Friendship ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid friendship ID format')
];

// Delete friendship validation rules
const deleteFriendshipRules = [
    param('id')
        .notEmpty()
        .withMessage('Friendship ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid friendship ID format')
];

// Check friendship status validation rules
const checkFriendshipStatusRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format')
];

module.exports = {
    getFriendRequestsRules,
    getFriendsRules,
    sendFriendRequestRules,
    acceptFriendRequestRules,
    rejectFriendRequestRules,
    cancelFriendRequestRules,
    deleteFriendshipRules,
    checkFriendshipStatusRules
};
