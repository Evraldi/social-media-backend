const express = require('express');
const { likePost, unlikePost } = require('../controllers/likeController');
const router = express.Router();

router.post('/like', likePost);
router.post('/unlike', unlikePost);

module.exports = router;
