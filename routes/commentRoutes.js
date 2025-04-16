const { createRouters } = require('../config/routeConfig');
const { cache, clearCache } = require('../middlewares/cacheMiddleware');
const { getComments, createComment, deleteComment, updateComment } = require('../controllers/commentController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    createCommentRules,
    updateCommentRules,
    deleteCommentRules,
    getCommentsRules
} = require('../validations/commentValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Public routes - no authentication required
// Add caching to GET routes (30 seconds TTL)
publicRouter.get('/posts/:post_id/comments', validate(getCommentsRules), cache(30), getComments);

// Add cache invalidation middleware for write operations
const invalidateCommentCache = (req, res, next) => {
    // After response is sent, clear the cache
    res.on('finish', async () => {
        // Only invalidate cache if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                // Clear post-related comment caches
                const post_id = req.params.post_id || (req.comment ? req.comment.post : null);
                if (post_id) {
                    await clearCache(`posts/${post_id}/comments*`);
                } else {
                    // If we don't have a post_id, clear all comment caches
                    await clearCache(`posts/*/comments*`);
                }
                console.log('Comment cache invalidated');
            } catch (error) {
                console.error('Error invalidating cache:', error);
            }
        }
    });
    next();
};

// Private routes - authentication required
privateRouter.post('/posts/:post_id/comments', validate(createCommentRules), invalidateCommentCache, createComment);

// For update and delete, we need to get the post_id from the comment first
const getCommentPostId = async (req, _, next) => {
    try {
        const { id } = req.params;
        const { Comment } = require('../models');
        const comment = await Comment.findById(id).select('post').lean();
        if (comment) {
            req.comment = comment;
        }
        next();
    } catch (error) {
        next(error);
    }
};

privateRouter.put('/comments/:id', validate(updateCommentRules), getCommentPostId, invalidateCommentCache, updateComment);
privateRouter.delete('/comments/:id', validate(deleteCommentRules), getCommentPostId, invalidateCommentCache, deleteComment);

module.exports = {
  publicCommentRoutes: publicRouter,
  privateCommentRoutes: privateRouter
};
