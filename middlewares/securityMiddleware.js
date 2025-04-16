/**
 * Security middleware for the application
 * This file provides security-related middleware functions
 */

/**
 * Middleware to add security headers to responses
 * @returns {Function} Express middleware function
 */
const securityHeaders = () => {
  return (req, res, next) => {
    // Set security headers

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS protection in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Restrict referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    // Customize this based on your application's needs
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'none'; connect-src 'self'"
    );

    // Prevent browsers from caching sensitive information
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    next();
  };
};

/**
 * Middleware to prevent parameter pollution
 * @returns {Function} Express middleware function
 */
const preventParamPollution = () => {
  return (req, res, next) => {
    // Clean up query parameters
    if (req.query) {
      const cleanQuery = {};

      // For each parameter, keep only the last value if it's an array
      Object.keys(req.query).forEach(key => {
        if (Array.isArray(req.query[key])) {
          cleanQuery[key] = req.query[key][req.query[key].length - 1];
        } else {
          cleanQuery[key] = req.query[key];
        }
      });

      req.query = cleanQuery;
    }

    next();
  };
};

/**
 * Middleware to validate content type
 * @param {Array} allowedTypes - Array of allowed content types
 * @returns {Function} Express middleware function
 */
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    // Skip for GET and DELETE requests as they typically don't have a body
    if (['GET', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Skip validation in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const contentType = req.headers['content-type'];

    // Check if content type is missing for requests that might have a body
    if (!contentType && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return res.status(415).json({
        success: false,
        message: 'Content-Type header is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check if content type is allowed
    const isAllowed = allowedTypes.some(type => contentType && contentType.includes(type));

    if (!isAllowed) {
      return res.status(415).json({
        success: false,
        message: `Unsupported Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

module.exports = {
  securityHeaders,
  preventParamPollution,
  validateContentType
};
