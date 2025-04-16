const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { User } = require('../models');
require('dotenv').config();

// Get environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Get public key for token verification
const publicKeyPath = process.env.PUBLIC_KEY_PATH;
const publicKey = fs.readFileSync(path.resolve(__dirname, '..', publicKeyPath), 'utf8');

/**
 * Standard error response for authentication failures
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details (optional)
 */
const authErrorResponse = (res, status, message, details = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    // Include error details in non-production environments
    if (details && NODE_ENV !== 'production') {
        response.details = details;
    }

    return res.status(status).json(response);
};

/**
 * Middleware to verify JWT access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyAccessToken = async (req, res, next) => {
    // Check if Authorization header exists and has Bearer token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return authErrorResponse(res, 401, 'Access denied. No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

        if (!decoded.id) {
            return authErrorResponse(res, 401, 'Invalid token format');
        }

        // Check if user exists in database
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return authErrorResponse(res, 401, 'Invalid token. User not found');
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        // Log error in non-production environments
        if (NODE_ENV !== 'production') {
            console.error('Token verification error:', error);
        }

        // Handle different JWT errors
        if (error.name === 'TokenExpiredError') {
            return authErrorResponse(res, 401, 'Token expired');
        } else if (error.name === 'JsonWebTokenError') {
            return authErrorResponse(res, 401, 'Invalid token', { error: error.message });
        } else {
            return authErrorResponse(res, 401, 'Authentication failed', { error: error.message });
        }
    }
};

/**
 * Middleware to optionally verify JWT access token
 * Unlike verifyAccessToken, this middleware will not block the request if no token is provided
 * It will simply set req.user to null and continue
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
    // Check if Authorization header exists and has Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

        // Check if user exists in database
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            // Invalid token, continue without authentication
            req.user = null;
            return next();
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        // Log error in non-production environments
        if (NODE_ENV !== 'production') {
            console.error('Optional auth token verification error:', error);
        }

        // Token verification failed, continue without authentication
        req.user = null;
        next();
    }
};

module.exports = { verifyAccessToken, optionalAuth };
