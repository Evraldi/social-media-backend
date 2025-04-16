const { createRouters } = require('../config/routeConfig');
const { loginUser, refreshToken, logoutUser, createUser } = require('../controllers/authController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    signupRules,
    loginRules,
    refreshTokenRules,
    logoutRules
} = require('../validations/authValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Public routes - no authentication required
publicRouter.post('/signup', validate(signupRules), createUser);
publicRouter.post('/register', validate(signupRules), createUser); // Alias for signup
publicRouter.post('/login', validate(loginRules), loginUser);

// Private routes - authentication required
privateRouter.post('/refresh-token', validate(refreshTokenRules), refreshToken);
privateRouter.post('/logout', validate(logoutRules), logoutUser);

module.exports = {
  publicAuthRoutes: publicRouter,
  privateAuthRoutes: privateRouter
};
