const express = require('express');
const router = express.Router();
const verifyAccessToken = require('../middlewares/authMiddleware');
const { loginUser, refreshToken, logoutUser, createUser } = require('../controllers/authController');

router.post('/signup', createUser);
router.post('/login', loginUser);
router.post('/refresh-token', verifyAccessToken, refreshToken);
router.post('/logout', verifyAccessToken, logoutUser);

module.exports = router;
