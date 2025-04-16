/**
 * Global error handling middleware
 */

const mongoose = require('mongoose');
const {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ConflictError
} = require('../utils/customErrors');

// Get environment
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Standard error response format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details (optional)
 * @returns {Object} Formatted error response
 */
const errorResponse = (res, statusCode, message, details = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    // Include error details
    if (details) {
        // For validation errors, use the 'errors' field for compatibility with tests
        if (Array.isArray(details)) {
            response.errors = details;
        } else {
            response.details = details;
        }
    }

    return res.status(statusCode).json(response);
};

/**
 * Handle MongoDB validation errors
 * @param {Error} err - MongoDB validation error
 * @returns {ValidationError} Validation error object
 */
const handleMongooseValidationError = (err) => {
    const errors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message,
        value: error.value
    }));

    return new ValidationError('Validation error', errors);
};

/**
 * Handle MongoDB duplicate key errors
 * @param {Error} err - MongoDB duplicate key error
 * @returns {ConflictError} Conflict error object
 */
const handleMongooseDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return new ConflictError(
        `Duplicate value for ${field}`,
        { field, value }
    );
};

/**
 * Handle MongoDB cast errors (invalid ObjectId, etc.)
 * @param {Error} err - MongoDB cast error
 * @returns {BadRequestError} Bad request error object
 */
const handleMongooseCastError = (err) => {
    return new BadRequestError(
        `Invalid ${err.path}: ${err.value}`,
        { field: err.path, value: err.value }
    );
};

/**
 * Handle JWT errors
 * @param {Error} err - JWT error
 * @returns {UnauthorizedError} Unauthorized error object
 */
const handleJWTError = (err) => {
    return new UnauthorizedError(
        'Invalid token',
        { error: err.message }
    );
};

/**
 * Handle JWT expired errors
 * @returns {UnauthorizedError} Unauthorized error object
 */
const handleJWTExpiredError = () => {
    return new UnauthorizedError(
        'Token expired',
        { error: 'Please log in again' }
    );
};

/**
 * Handle multer errors
 * @param {Error} err - Multer error
 * @returns {BadRequestError} Bad request error object
 */
const handleMulterError = (err) => {
    return new BadRequestError(
        'File upload error',
        { error: err.message }
    );
};

/**
 * Global error handling middleware
 * This middleware should be used after all routes
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, _req, res, _next) => {
    // Log error in non-production environments
    if (NODE_ENV !== 'production') {
        console.error('Error:', err);
    }

    // Convert specific error types to our custom error classes
    let error = err;

    // Handle specific error types
    if (err instanceof mongoose.Error.ValidationError) {
        error = handleMongooseValidationError(err);
    } else if (err.code === 11000) { // MongoDB duplicate key error
        error = handleMongooseDuplicateKeyError(err);
    } else if (err instanceof mongoose.Error.CastError) {
        error = handleMongooseCastError(err);
    } else if (err.name === 'JsonWebTokenError') {
        error = handleJWTError(err);
    } else if (err.name === 'TokenExpiredError') {
        error = handleJWTExpiredError();
    } else if (err.name === 'MulterError') {
        error = handleMulterError(err);
    } else if (!(err instanceof ApiError)) {
        // If it's not one of our custom errors, convert it to an internal server error
        error = new ApiError(
            err.message || 'Something went wrong',
            500,
            NODE_ENV === 'production' ? null : { stack: err.stack }
        );
    }

    // Send error response
    return errorResponse(
        res,
        error.statusCode,
        error.message,
        error.details
    );
};

/**
 * Not found middleware
 * This middleware should be used after all routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, _res, next) => {
    const error = new NotFoundError(`Route not found - ${req.originalUrl}`);
    next(error);
};

/**
 * Async handler to catch errors in async route handlers
 * This eliminates the need for try/catch blocks in controllers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, notFound, asyncHandler, errorResponse };
