const multer = require('multer');
const { createRouters } = require('../config/routeConfig');
const { cache, clearCache } = require('../middlewares/cacheMiddleware');
const {
    getUsers,
    getUserProfiles,
    getUserProfileById,
    upsertUserProfile,
    deleteUserProfile
} = require('../controllers/userController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    getUsersRules,
    getUserProfilesRules,
    getUserProfileByIdRules,
    upsertUserProfileRules,
    deleteUserProfileRules
} = require('../validations/userValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/profiles');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Public routes - no authentication required
// Add caching to GET routes (60 seconds TTL)
publicRouter.get('/users', validate(getUsersRules), cache(60), getUsers);

// Private routes - authentication required
// Add caching to GET routes (30 seconds TTL for private data)
privateRouter.get('/users/:user_id/profiles', validate(getUserProfilesRules), cache(30), getUserProfiles);
privateRouter.get('/users/:user_id/profiles/:id', validate(getUserProfileByIdRules), cache(30), getUserProfileById);

// Add cache invalidation middleware for write operations
const invalidateUserCache = (req, res, next) => {
    // After response is sent, clear the cache
    res.on('finish', async () => {
        // Only invalidate cache if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                const { user_id } = req.params;
                // Clear user-related caches
                await clearCache(`users*`);
                await clearCache(`users/${user_id}*`);
                console.log(`User cache invalidated for user ${user_id}`);
            } catch (error) {
                console.error('Error invalidating cache:', error);
            }
        }
    });
    next();
};

privateRouter.put('/users/:user_id/profiles/:id', upload.single('image'), validate(upsertUserProfileRules), invalidateUserCache, upsertUserProfile);
privateRouter.delete('/users/:user_id/profiles/:id', validate(deleteUserProfileRules), invalidateUserCache, deleteUserProfile);

module.exports = {
  publicUserRoutes: publicRouter,
  privateUserRoutes: privateRouter
};
