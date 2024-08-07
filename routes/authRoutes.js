const express = require('express');
const router = express.Router();
const verifyAccessToken = require('../middlewares/authMiddleware');
const { loginUser, refreshToken, logoutUser, createUser } = require('../controllers/authController');

router.post('/auth/signup', createUser);
router.post('/auth/login', loginUser);
router.post('/auth/refresh-token', verifyAccessToken, refreshToken);
router.post('/auth/logout', verifyAccessToken, logoutUser);

module.exports = router;
