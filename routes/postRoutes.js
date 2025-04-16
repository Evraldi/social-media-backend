const multer = require('multer');
const { createRouters } = require('../config/routeConfig');
const { optionalAuth } = require('../middlewares/authMiddleware');
const { cache, clearCache } = require('../middlewares/cacheMiddleware');
const {
    createPost,
    getPosts,
    deletePost,
    updatePost,
    getPostsByUserId,
    getPostById
} = require('../controllers/postController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    getPostsRules,
    getPostByIdRules,
    getPostsByUserIdRules,
    createPostRules,
    updatePostRules,
    deletePostRules
} = require('../validations/postValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/posts');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Public routes with optional authentication
// We use a middleware chain with the router
const optionalAuthRouter = publicRouter.use(optionalAuth);

// Add caching to GET routes (60 seconds TTL)
optionalAuthRouter.get('/posts', validate(getPostsRules), cache(60), getPosts);
optionalAuthRouter.get('/posts/:id', validate(getPostByIdRules), cache(60), getPostById);
optionalAuthRouter.get('/users/:user_id/posts', validate(getPostsByUserIdRules), cache(60), getPostsByUserId);

// Private routes - authentication required
// Add cache invalidation middleware for write operations
const invalidatePostCache = (req, res, next) => {
    // After response is sent, clear the cache
    res.on('finish', async () => {
        // Only invalidate cache if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                // Clear specific cache keys first
                await clearCache('posts'); // Clear /api/posts

                // If we have a post ID (for updates/deletes), clear that specific post
                if (req.params.id) {
                    await clearCache(`posts/${req.params.id}`);
                }

                // Clear user-specific post caches if we have a user
                if (req.user && req.user._id) {
                    await clearCache(`users/${req.user._id}/posts`);
                }

                // Also clear with wildcards as a fallback
                await clearCache('posts*');
                await clearCache('users/*/posts*');

                console.log('Post cache invalidated');
            } catch (error) {
                console.error('Error invalidating cache:', error);
            }
        }
    });
    next();
};

privateRouter.post('/posts', upload.single('image'), validate(createPostRules), invalidatePostCache, createPost);
privateRouter.put('/posts/:id', upload.single('image'), validate(updatePostRules), invalidatePostCache, updatePost);
privateRouter.delete('/posts/:id', validate(deletePostRules), invalidatePostCache, deletePost);

module.exports = {
  publicPostRoutes: publicRouter,
  privatePostRoutes: privateRouter
};
