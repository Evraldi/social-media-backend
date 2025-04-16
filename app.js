const express = require('express');
const { initDb } = require('./models');
const { connectRedis } = require('./config/redis');
const cors = require('cors');
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');
const rateLimiter = require('./middlewares/rateLimitMiddleware');
const { securityHeaders, preventParamPollution, validateContentType } = require('./middlewares/securityMiddleware');
const { sanitize } = require('./middlewares/validationMiddleware');
require('dotenv').config();

// Import route registry
const { registerRoutes } = require('./config/routeRegistry');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(securityHeaders());
app.use(preventParamPollution());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Content type validation
app.use(validateContentType(['application/json', 'multipart/form-data']));

// Global sanitization middleware
app.use(sanitize());

// Static files for uploads with security headers
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
}, express.static('uploads', { maxAge: 31536000 })); // 1 year

// Register all routes
registerRoutes(app);

// API Health check endpoint
app.get('/api/health', (_, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
    try {
        // Connect to MongoDB
        await initDb();

        // Connect to Redis (non-blocking)
        connectRedis().catch(err => {
            console.warn('Redis connection failed, continuing without caching:', err.message);
        });

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
        return server;
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;
