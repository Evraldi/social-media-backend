const express = require('express');
const multer = require('multer');
const {
    createPost,
    getPosts,
    deletePost,
    updatePost,
    getPostsByUserId,
    getPostById
} = require('../controllers/postController');

const router = express.Router();

const upload = multer({ dest: 'uploads/posts', limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', getPosts);
router.get('/posts', getPostsByUserId);
router.get('/:id', getPostById);
router.post('/', upload.single('image'), createPost);
router.put('/:id', upload.single('image'), updatePost);
router.delete('/:id', deletePost);

module.exports = router;
