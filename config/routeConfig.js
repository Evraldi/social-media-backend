/**
 * Route configuration utility
 * This file provides utilities for creating and configuring public and private routes
 */

const express = require('express');
const { verifyAccessToken } = require('../middlewares/authMiddleware');

/**
 * Create public and private routers
 * @returns {Object} Object containing public and private router instances
 */
const createRouters = () => {
  return {
    // Public router - no authentication required
    publicRouter: express.Router(),
    
    // Private router - authentication required for all routes
    privateRouter: express.Router().use(verifyAccessToken)
  };
};

module.exports = {
  createRouters
};
