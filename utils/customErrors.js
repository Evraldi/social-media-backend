/**
 * Custom error classes for the application
 * These classes extend the built-in Error class to provide more context
 */

/**
 * Base API Error class
 * All custom API errors should extend this class
 */
class ApiError extends Error {
  /**
   * Create a new ApiError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {any} details - Additional error details
   */
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Indicates if this is an operational error that we can anticipate
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 * Used for validation errors and malformed requests
 */
class BadRequestError extends ApiError {
  /**
   * Create a new BadRequestError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Bad request', details = null) {
    super(message, 400, details);
  }
}

/**
 * Unauthorized Error (401)
 * Used when authentication is required but failed or not provided
 */
class UnauthorizedError extends ApiError {
  /**
   * Create a new UnauthorizedError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, details);
  }
}

/**
 * Forbidden Error (403)
 * Used when a user is authenticated but doesn't have permission
 */
class ForbiddenError extends ApiError {
  /**
   * Create a new ForbiddenError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Access forbidden', details = null) {
    super(message, 403, details);
  }
}

/**
 * Not Found Error (404)
 * Used when a requested resource doesn't exist
 */
class NotFoundError extends ApiError {
  /**
   * Create a new NotFoundError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, details);
  }
}

/**
 * Method Not Allowed Error (405)
 * Used when the HTTP method is not supported for the requested resource
 */
class MethodNotAllowedError extends ApiError {
  /**
   * Create a new MethodNotAllowedError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Method not allowed', details = null) {
    super(message, 405, details);
  }
}

/**
 * Conflict Error (409)
 * Used for resource conflicts (e.g., duplicate email)
 */
class ConflictError extends ApiError {
  /**
   * Create a new ConflictError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, details);
  }
}

/**
 * Validation Error (422)
 * Used for validation errors that are more specific than BadRequestError
 */
class ValidationError extends ApiError {
  /**
   * Create a new ValidationError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Validation error', details = null) {
    super(message, 422, details);
  }
}

/**
 * Too Many Requests Error (429)
 * Used when rate limit is exceeded
 */
class TooManyRequestsError extends ApiError {
  /**
   * Create a new TooManyRequestsError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Too many requests', details = null) {
    super(message, 429, details);
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
class InternalServerError extends ApiError {
  /**
   * Create a new InternalServerError
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   */
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, details);
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError
};
