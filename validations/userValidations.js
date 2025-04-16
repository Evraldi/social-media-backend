const { body, param, query } = require('express-validator');
const { isValidObjectId, isValidAndSafeUrl } = require('../utils/validationUtils');

// Common pagination validation rules
const paginationRules = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt()
];

// Common search validation rules
const searchRules = [
    query('search')
        .optional()
        .isString()
        .withMessage('Search query must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters')
        .trim()
        .escape()
];

// Get users validation rules
const getUsersRules = [
    ...paginationRules,
    ...searchRules,

    query('sort')
        .optional()
        .isIn(['username', 'created_at', 'updated_at'])
        .withMessage('Sort must be one of: username, created_at, updated_at'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be one of: asc, desc')
];

// Get user profiles validation rules
const getUserProfilesRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    ...paginationRules
];

// Get user profile by ID validation rules
const getUserProfileByIdRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    param('id')
        .notEmpty()
        .withMessage('Profile ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid profile ID format')
];

// Update user profile validation rules
const upsertUserProfileRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    param('id')
        .notEmpty()
        .withMessage('Profile ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid profile ID format'),

    body('full_name')
        .optional()
        .isString()
        .withMessage('Full name must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Full name must be between 1 and 100 characters')
        .trim()
        .escape(),

    body('bio')
        .optional()
        .isString()
        .withMessage('Bio must be a string')
        .isLength({ max: 500 })
        .withMessage('Bio must be less than 500 characters')
        .trim()
        .escape(),

    body('location')
        .optional()
        .isString()
        .withMessage('Location must be a string')
        .isLength({ max: 100 })
        .withMessage('Location must be less than 100 characters')
        .trim()
        .escape(),

    body('website')
        .optional()
        .isURL()
        .withMessage('Website must be a valid URL')
        .custom((value) => {
            if (!isValidAndSafeUrl(value)) {
                throw new Error('Website URL is not valid or safe');
            }
            return true;
        }),

    body('social_links')
        .optional()
        .isObject()
        .withMessage('Social links must be an object'),

    body('social_links.*.url')
        .optional()
        .isURL()
        .withMessage('Social link URL must be a valid URL')
        .custom((value) => {
            if (!isValidAndSafeUrl(value)) {
                throw new Error('Social link URL is not valid or safe');
            }
            return true;
        }),

    body('privacy_settings')
        .optional()
        .isObject()
        .withMessage('Privacy settings must be an object'),

    body('privacy_settings.profile_visibility')
        .optional()
        .isIn(['public', 'private', 'friends'])
        .withMessage('Profile visibility must be one of: public, private, friends')
];

// Delete user profile validation rules
const deleteUserProfileRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    param('id')
        .notEmpty()
        .withMessage('Profile ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid profile ID format')
];

// Update user validation rules
const updateUserRules = [
    param('id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    body('username')
        .optional()
        .isString()
        .withMessage('Username must be a string')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .trim()
        .escape(),

    body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail()
];

module.exports = {
    getUsersRules,
    getUserProfilesRules,
    getUserProfileByIdRules,
    upsertUserProfileRules,
    deleteUserProfileRules,
    updateUserRules,
    paginationRules,
    searchRules
};
