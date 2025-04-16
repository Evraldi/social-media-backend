const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/validationUtils');
const { paginationRules, searchRules } = require('./userValidations');

// Get posts validation rules
const getPostsRules = [
    ...paginationRules,
    ...searchRules,

    query('sort')
        .optional()
        .isIn(['created_at', 'updated_at', 'likes_count', 'comments_count'])
        .withMessage('Sort must be one of: created_at, updated_at, likes_count, comments_count'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be one of: asc, desc'),

    query('visibility')
        .optional()
        .isIn(['public', 'private', 'friends', 'all'])
        .withMessage('Visibility must be one of: public, private, friends, all')
];

// Get post by ID validation rules
const getPostByIdRules = [
    param('id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format')
];

// Get posts by user ID validation rules
const getPostsByUserIdRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    ...paginationRules,

    query('visibility')
        .optional()
        .isIn(['public', 'private', 'friends', 'all'])
        .withMessage('Visibility must be one of: public, private, friends, all')
];

// Create post validation rules
const createPostRules = [
    body('content')
        .optional()
        .isString()
        .withMessage('Content must be a string')
        .isLength({ min: 1, max: 5000 })
        .withMessage('Content must be between 1 and 5000 characters')
        .trim(),

    body('visibility')
        .optional()
        .isIn(['public', 'private', 'friends'])
        .withMessage('Visibility must be one of: public, private, friends'),

    body('location')
        .optional()
        .isObject()
        .withMessage('Location must be an object'),

    body('location.name')
        .optional()
        .isString()
        .withMessage('Location name must be a string')
        .isLength({ max: 100 })
        .withMessage('Location name must be less than 100 characters')
        .trim()
        .escape(),

    body('location.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),

    body('location.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),

    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),

    body('tags.*')
        .optional()
        .isString()
        .withMessage('Each tag must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Each tag must be between 1 and 50 characters')
        .trim()
        .escape(),

    body('feeling')
        .optional()
        .isString()
        .withMessage('Feeling must be a string')
        .isLength({ max: 50 })
        .withMessage('Feeling must be less than 50 characters')
        .trim()
        .escape()
];

// Update post validation rules
const updatePostRules = [
    param('id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format'),

    body('content')
        .optional()
        .isString()
        .withMessage('Content must be a string')
        .isLength({ min: 1, max: 5000 })
        .withMessage('Content must be between 1 and 5000 characters')
        .trim(),

    body('visibility')
        .optional()
        .isIn(['public', 'private', 'friends'])
        .withMessage('Visibility must be one of: public, private, friends'),

    body('location')
        .optional()
        .isObject()
        .withMessage('Location must be an object'),

    body('location.name')
        .optional()
        .isString()
        .withMessage('Location name must be a string')
        .isLength({ max: 100 })
        .withMessage('Location name must be less than 100 characters')
        .trim()
        .escape(),

    body('location.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),

    body('location.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),

    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),

    body('tags.*')
        .optional()
        .isString()
        .withMessage('Each tag must be a string')
        .isLength({ min: 1, max: 50 })
        .withMessage('Each tag must be between 1 and 50 characters')
        .trim()
        .escape(),

    body('feeling')
        .optional()
        .isString()
        .withMessage('Feeling must be a string')
        .isLength({ max: 50 })
        .withMessage('Feeling must be less than 50 characters')
        .trim()
        .escape()
];

// Delete post validation rules
const deletePostRules = [
    param('id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format')
];

module.exports = {
    getPostsRules,
    getPostByIdRules,
    getPostsByUserIdRules,
    createPostRules,
    updatePostRules,
    deletePostRules
};
