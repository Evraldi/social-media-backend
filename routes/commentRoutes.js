const express = require('express');
const { getComments, createComment, deleteComment } = require('../controllers/commentController');
const router = express.Router();

router.get('/:post_id', getComments);
router.post('/', createComment);
router.delete('/:id', deleteComment);

module.exports = router;
