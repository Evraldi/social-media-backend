const multer = require('multer');
const { createRouters } = require('../config/routeConfig');
const {
    uploadMedia,
    getMediaByUserId,
    getMediaByPostId,
    getMediaById,
    deleteMedia
} = require('../controllers/mediaController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    getMediaByUserIdRules,
    getMediaByPostIdRules,
    uploadMediaRules,
    deleteMediaRules
} = require('../validations/mediaValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/media');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        // Accept images and videos
        if (!file.mimetype.match(/\.(jpg|jpeg|png|gif|mp4|webm|mov)$/)) {
            return cb(new Error('Only image and video files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Public routes - no authentication required
publicRouter.get('/users/:user_id/media', validate(getMediaByUserIdRules), getMediaByUserId);
publicRouter.get('/posts/:post_id/media', validate(getMediaByPostIdRules), getMediaByPostId);
publicRouter.get('/media/:id', validate(deleteMediaRules), getMediaById);

// Private routes - authentication required
privateRouter.post('/media', upload.single('media'), validate(uploadMediaRules), uploadMedia);
privateRouter.delete('/media/:id', validate(deleteMediaRules), deleteMedia);

module.exports = {
  publicMediaRoutes: publicRouter,
  privateMediaRoutes: privateRouter
};
