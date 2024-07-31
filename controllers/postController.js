const { Post, User } = require('../models');

const getPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({ include: User });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve posts" });
    }
};

const createPost = async (req, res) => {
    const { user_id, content, image_url } = req.body;
    try {
        const newPost = await Post.create({ user_id, content, image_url });
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ error: "Failed to create post" });
    }
};

const deletePost = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Post.destroy({ where: { id } });
        if (result) {
            res.status(200).json({ message: "Post deleted" });
        } else {
            res.status(404).json({ error: "Post not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to delete post" });
    }
};

module.exports = { getPosts, createPost, deletePost };
