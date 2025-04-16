/**
 * Route registry for the application
 * This file handles the registration of all routes in the application
 */

// Import all route modules
const { publicUserRoutes, privateUserRoutes } = require('../routes/userRoutes');
const { publicAuthRoutes, privateAuthRoutes } = require('../routes/authRoutes');
const { publicPostRoutes, privatePostRoutes } = require('../routes/postRoutes');
const { publicCommentRoutes, privateCommentRoutes } = require('../routes/commentRoutes');
const { publicLikeRoutes, privateLikeRoutes } = require('../routes/likeRoutes');
const { publicFriendshipRoutes, privateFriendshipRoutes } = require('../routes/friendshipRoutes');
const { publicMessageRoutes, privateMessageRoutes } = require('../routes/messageRoutes');
const { publicFollowerRoutes, privateFollowerRoutes } = require('../routes/followerRoutes');
const { publicNotificationRoutes, privateNotificationRoutes } = require('../routes/notificationRoutes');
const { publicMediaRoutes, privateMediaRoutes } = require('../routes/mediaRoutes');

/**
 * Register all routes with the Express app
 * @param {Object} app - Express app instance
 */
const registerRoutes = (app) => {
  // Public API Routes - no authentication required
  app.use('/api', publicUserRoutes);
  app.use('/api', publicAuthRoutes);
  app.use('/api', publicPostRoutes);
  app.use('/api', publicCommentRoutes);
  app.use('/api', publicLikeRoutes);
  app.use('/api', publicFriendshipRoutes);
  app.use('/api', publicMessageRoutes);
  app.use('/api', publicFollowerRoutes);
  app.use('/api', publicNotificationRoutes);
  app.use('/api', publicMediaRoutes);

  // Private API Routes - authentication required
  app.use('/api', privateUserRoutes);
  app.use('/api', privateAuthRoutes);
  app.use('/api', privatePostRoutes);
  app.use('/api', privateCommentRoutes);
  app.use('/api', privateLikeRoutes);
  app.use('/api', privateFriendshipRoutes);
  app.use('/api', privateMessageRoutes);
  app.use('/api', privateFollowerRoutes);
  app.use('/api', privateNotificationRoutes);
  app.use('/api', privateMediaRoutes);
};

module.exports = { registerRoutes };
