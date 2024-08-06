const express = require('express');
const { followUser, unfollowUser, getFollowersByUserId } = require('../controllers/followerController');
const router = express.Router();

router.post('/', followUser);
router.delete('/', unfollowUser);
router.get('/:user_id', getFollowersByUserId);

module.exports = router;
