const express = require('express');
const router = express.Router();
const { getUsers, createUser, loginUser, refreshToken, logoutUser } = require('../controllers/userController');


router.get('/', getUsers);
router.post('/register', createUser);
router.post('/login', loginUser);
router.post('/refresh-token', refreshToken);
router.post('/logout', logoutUser);

module.exports = router;
