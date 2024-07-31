const express = require('express');
const { followUser, unfollowUser } = require('../controllers/followerController');
const router = express.Router();

router.post('/', followUser);
router.delete('/', unfollowUser);

module.exports = router;
