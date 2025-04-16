const { body, param, query } = require('express-validator');
const { isValidObjectId, isAllowedFileType, isAllowedFileSize } = require('../utils/validationUtils');
const { paginationRules } = require('./userValidations');
const { BadRequestError } = require('../utils/customErrors');

/**
 * Media validation rules
 */

// Get media by user ID validation rules
const getMediaByUserIdRules = [
    param('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid user ID format'),

    ...paginationRules,

    query('type')
        .optional()
        .isIn(['image', 'video', 'audio', 'document', 'all'])
        .withMessage('Type must be one of: image, video, audio, document, all'),

    query('sort')
        .optional()
        .isIn(['created_at', 'file_size'])
        .withMessage('Sort must be one of: created_at, file_size'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be one of: asc, desc')
];

// Get media by post ID validation rules
const getMediaByPostIdRules = [
    param('post_id')
        .notEmpty()
        .withMessage('Post ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format'),

    ...paginationRules,

    query('type')
        .optional()
        .isIn(['image', 'video', 'audio', 'document', 'all'])
        .withMessage('Type must be one of: image, video, audio, document, all')
];

// Upload media validation rules
const uploadMediaRules = [
    // File validation will be handled by multer middleware
    // Here we validate other parameters

    body('post_id')
        .optional()
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid post ID format'),

    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters')
        .trim(),

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

    // Custom validator to check file type and size
    (req, _res, next) => {
        try {
            if (!req.file) {
                throw new BadRequestError('No file uploaded');
            }

            // Check file type
            const allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            const allowedVideoTypes = ['mp4', 'webm', 'ogg', 'mov'];
            const allowedAudioTypes = ['mp3', 'wav', 'ogg', 'aac'];
            const allowedDocumentTypes = ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'];

            const allowedTypes = [
                ...allowedImageTypes,
                ...allowedVideoTypes,
                ...allowedAudioTypes,
                ...allowedDocumentTypes
            ];

            if (!isAllowedFileType(req.file.originalname, allowedTypes)) {
                throw new BadRequestError('Invalid file type. Allowed types: ' + allowedTypes.join(', '));
            }

            // Check file size (10MB limit)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (!isAllowedFileSize(req.file.size, maxSize)) {
                throw new BadRequestError('File size exceeds the limit of 10MB');
            }

            next();
        } catch (error) {
            next(error);
        }
    }
];

// Delete media validation rules
const deleteMediaRules = [
    param('id')
        .notEmpty()
        .withMessage('Media ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid media ID format')
];

// Get media by ID validation rules
const getMediaByIdRules = [
    param('id')
        .notEmpty()
        .withMessage('Media ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid media ID format')
];

// Update media validation rules
const updateMediaRules = [
    param('id')
        .notEmpty()
        .withMessage('Media ID is required')
        .custom((value) => isValidObjectId(value))
        .withMessage('Invalid media ID format'),

    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters')
        .trim(),

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
        .escape()
];

module.exports = {
    getMediaByUserIdRules,
    getMediaByPostIdRules,
    uploadMediaRules,
    deleteMediaRules,
    getMediaByIdRules,
    updateMediaRules
};
