const express = require('express');
const { getComments, createComment, deleteComment, updateComment } = require('../controllers/commentController');
const router = express.Router();

router.get('/posts/:post_id/comments', getComments);
router.post('/posts/:post_id/comments', createComment);
router.put('/comments/:id', updateComment);
router.delete('/comments/:id', deleteComment);

module.exports = router;
