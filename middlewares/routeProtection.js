/**
 * This file contains utility functions to help with route protection
 * without applying middleware globally to all routes.
 */

const { verifyAccessToken } = require('./authMiddleware');

/**
 * Protect specific routes with authentication middleware
 * @param {Object} router - Express router
 * @param {Array} routes - Array of route objects with method, path, and handlers
 */
const protectRoutes = (router, routes) => {
  routes.forEach(route => {
    const { method, path, handlers } = route;

    // Add authentication middleware before the route handlers
    router[method.toLowerCase()](path, verifyAccessToken, ...handlers);
  });
};

module.exports = {
  protectRoutes
};
