const express = require('express');
const router = express.Router();
const verifyAccessToken = require('../middlewares/authMiddleware');
const { getUsers, createUser, loginUser, refreshToken, logoutUser } = require('../controllers/userController');

router.post('/login', loginUser);
router.post('/register', createUser);

router.get('/users', verifyAccessToken, getUsers);
router.post('/refresh-token', verifyAccessToken, refreshToken);
router.post('/logout', verifyAccessToken, logoutUser);

module.exports = router;
