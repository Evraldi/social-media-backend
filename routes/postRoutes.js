const express = require('express');
const multer = require('multer');
const { createPost, getPosts, deletePost } = require('../controllers/postController');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.get('/', getPosts);
router.post('/', upload.single('image'), createPost);
router.delete('/:id', deletePost);

module.exports = router;
