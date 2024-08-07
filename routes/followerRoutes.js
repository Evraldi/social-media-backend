const express = require('express');
const { followUser, unfollowUser, getFollowersByUserId } = require('../controllers/followerController');
const router = express.Router();

router.post('/followers', followUser);
router.delete('/followers', unfollowUser);
router.get('/followers/:user_id', getFollowersByUserId);

module.exports = router;
