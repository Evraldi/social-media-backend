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

router.get('/posts', getPosts);
router.get('/users/:user_id/posts', getPostsByUserId);
router.get('/posts/:id', getPostById);
router.post('/posts', upload.single('image'), createPost);
router.put('/posts/:id', upload.single('image'), updatePost);
router.delete('/posts/:id', deletePost);


module.exports = router;
