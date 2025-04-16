const { validationResult } = require('express-validator');
const { sanitizeObject } = require('../utils/validationUtils');
const { BadRequestError } = require('../utils/customErrors');

/**
 * Middleware to validate request data using express-validator
 * @param {Array} validations - Array of express-validator validation rules
 * @returns {Function} Express middleware function
 */
const validate = (validations) => {
    return async (req, res, next) => {
        try {
            // Execute all validations
            await Promise.all(validations.map(validation => validation.run(req)));

            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                // Format validation errors for better readability
                const formattedErrors = errors.array().map(error => ({
                    field: error.path,
                    message: error.msg,
                    value: error.value
                }));

                throw new BadRequestError('Validation error', formattedErrors);
            }

            // Sanitize request body, query, and params to prevent XSS attacks
            if (req.body && Object.keys(req.body).length > 0) {
                req.body = sanitizeObject(req.body);
            }

            if (req.query && Object.keys(req.query).length > 0) {
                req.query = sanitizeObject(req.query);
            }

            if (req.params && Object.keys(req.params).length > 0) {
                req.params = sanitizeObject(req.params);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to sanitize request data without validation
 * @returns {Function} Express middleware function
 */
const sanitize = () => {
    return (req, res, next) => {
        try {
            // Sanitize request body, query, and params to prevent XSS attacks
            if (req.body && Object.keys(req.body).length > 0) {
                req.body = sanitizeObject(req.body);
            }

            if (req.query && Object.keys(req.query).length > 0) {
                req.query = sanitizeObject(req.query);
            }

            if (req.params && Object.keys(req.params).length > 0) {
                req.params = sanitizeObject(req.params);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { validate, sanitize };
