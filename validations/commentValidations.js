const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/validationUtils');
const { paginationRules } = require('./userValidations');

/**
 * Comment validation rules
 */

// Create comment validation rules
const createCommentRules = [
    param('post_id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format'),

    // User ID is now taken from the authenticated user

    body('content')
        .notEmpty()
        .withMessage('Content is required')
        .isString()
        .withMessage('Content must be a string')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Content must be between 1 and 1000 characters')
        .trim(),

    body('parent_id')
        .optional()
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid parent comment ID format')
];

// Update comment validation rules
const updateCommentRules = [
    param('id')
        .notEmpty()
        .withMessage('Comment ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid comment ID format'),

    body('content')
        .notEmpty()
        .withMessage('Content is required')
        .isString()
        .withMessage('Content must be a string')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Content must be between 1 and 1000 characters')
        .trim()
];

// Delete comment validation rules
const deleteCommentRules = [
    param('id')
        .notEmpty()
        .withMessage('Comment ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid comment ID format')
];

// Get comments validation rules
const getCommentsRules = [
    param('post_id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format'),

    ...paginationRules,

    query('sort')
        .optional()
        .isIn(['created_at', 'updated_at', 'likes_count'])
        .withMessage('Sort must be one of: created_at, updated_at, likes_count'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be one of: asc, desc')
];

// Get comment by ID validation rules
const getCommentByIdRules = [
    param('id')
        .notEmpty()
        .withMessage('Comment ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid comment ID format')
];

// Get replies validation rules
const getRepliesRules = [
    param('comment_id')
        .notEmpty()
        .withMessage('Comment ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid comment ID format'),

    ...paginationRules
];

module.exports = {
    createCommentRules,
    updateCommentRules,
    deleteCommentRules,
    getCommentsRules,
    getCommentByIdRules,
    getRepliesRules
};
