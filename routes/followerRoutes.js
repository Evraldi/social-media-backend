const { createRouters } = require('../config/routeConfig');
const {
    followUser,
    unfollowUser,
    getFollowersByUserId,
    getFollowingByUserId
} = require('../controllers/followerController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    getFollowersRules,
    getFollowingRules
} = require('../validations/followerValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Public routes - no authentication required
publicRouter.get('/users/:user_id/followers', validate(getFollowersRules), getFollowersByUserId);
publicRouter.get('/users/:user_id/following', validate(getFollowingRules), getFollowingByUserId);

// Private routes - authentication required
privateRouter.post('/users/:user_id/follow', validate(getFollowersRules), followUser);
privateRouter.delete('/users/:user_id/follow', validate(getFollowersRules), unfollowUser);

module.exports = {
  publicFollowerRoutes: publicRouter,
  privateFollowerRoutes: privateRouter
};
