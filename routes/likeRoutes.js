const { createRouters } = require('../config/routeConfig');
const { createLike, deleteLike, getLikes } = require('../controllers/likeController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    getLikesRules,
    createLikeRules,
    deleteLikeRules
} = require('../validations/likeValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Public routes - no authentication required
publicRouter.get('/posts/:post_id/likes', validate(getLikesRules), getLikes);

// Private routes - authentication required
privateRouter.post('/posts/:post_id/likes', validate(createLikeRules), createLike);
privateRouter.delete('/posts/:post_id/likes', validate(deleteLikeRules), deleteLike);

module.exports = {
  publicLikeRoutes: publicRouter,
  privateLikeRoutes: privateRouter
};
