const express = require('express');
const { likePost, unlikePost, getLikesByPostId } = require('../controllers/likeController');
const router = express.Router();

router.post('/like', likePost);
router.post('/unlike', unlikePost);
router.get('/likes/:postId', getLikesByPostId);

module.exports = router;
