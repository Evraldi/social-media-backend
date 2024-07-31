const express = require('express');
const multer = require('multer');
const { createPost, getPosts, deletePost, updatePost } = require('../controllers/postController');
const router = express.Router();

const upload = multer({ dest: 'uploads/posts' });

router.get('/', getPosts);
router.post('/', upload.single('image'), createPost);
router.put('/:id', upload.single('image'), updatePost);
router.delete('/:id', deletePost);

module.exports = router;
