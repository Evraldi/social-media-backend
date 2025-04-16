/**
 * Simple in-memory rate limiter
 * Note: For production, use a Redis-based solution like 'express-rate-limit' with 'rate-limit-redis'
 */

// Store for rate limiting data
const rateLimit = {
    // Structure: { [ip]: { count: number, resetTime: Date } }
    store: {},
    
    // Clean up expired entries every hour
    cleanup: function() {
        const now = Date.now();
        Object.keys(this.store).forEach(key => {
            if (this.store[key].resetTime < now) {
                delete this.store[key];
            }
        });
    }
};

// Start cleanup interval
setInterval(() => rateLimit.cleanup(), 60 * 60 * 1000); // 1 hour

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests in the time window
 * @param {string} options.message - Error message to return
 * @returns {Function} Express middleware function
 */
const rateLimiter = (options = {}) => {
    const {
        windowMs = 60 * 1000, // 1 minute by default
        max = 100, // 100 requests per minute by default
        message = 'Too many requests, please try again later.'
    } = options;
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        // Initialize or reset if expired
        if (!rateLimit.store[ip] || rateLimit.store[ip].resetTime < now) {
            rateLimit.store[ip] = {
                count: 1,
                resetTime: now + windowMs
            };
            return next();
        }
        
        // Increment count
        rateLimit.store[ip].count++;
        
        // Check if over limit
        if (rateLimit.store[ip].count > max) {
            return res.status(429).json({
                success: false,
                message,
                timestamp: new Date().toISOString(),
                retryAfter: Math.ceil((rateLimit.store[ip].resetTime - now) / 1000)
            });
        }
        
        next();
    };
};

module.exports = rateLimiter;
