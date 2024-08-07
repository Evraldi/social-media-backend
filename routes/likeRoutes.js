const express = require('express');
const { likePost, unlikePost, getLikesByPostId } = require('../controllers/likeController');
const router = express.Router();

router.put('/posts/:post_id/like', likePost);
router.delete('/posts/:post_id/like', unlikePost);
router.get('/posts/:post_id/likes', getLikesByPostId);


module.exports = router;
