/**
 * Centralized error handling utilities
 * This file contains utilities for standardized error handling across the application
 */

// Get environment
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Custom API Error class
 * Base class for all API errors
 */
class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Indicates if this is an operational error that we can anticipate
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 * Used for validation errors and malformed requests
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, details);
  }
}

/**
 * Unauthorized Error (401)
 * Used when authentication is required but failed or not provided
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, details);
  }
}

/**
 * Forbidden Error (403)
 * Used when a user is authenticated but doesn't have permission
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden', details = null) {
    super(message, 403, details);
  }
}

/**
 * Not Found Error (404)
 * Used when a requested resource doesn't exist
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, details);
  }
}

/**
 * Conflict Error (409)
 * Used for resource conflicts (e.g., duplicate email)
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, details);
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, details);
  }
}

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

  // Include error details in non-production environments
  if (details && NODE_ENV !== 'production') {
    response.details = details;
  }

  return res.status(statusCode).json(response);
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

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  errorResponse,
  asyncHandler
};
