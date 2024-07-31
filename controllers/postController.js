const { Post, User } = require('../models');

const getPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({ include: User });
        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${posts.length} post(s)`,
            data: posts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve posts",
            error: error.message
        });
    }
};

const createPost = async (req, res) => {
    const { user_id, content, image_url } = req.body;
    try {
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const newPost = await Post.create({ user_id, content, image_url });
        res.status(201).json({
            success: true,
            message: "Post successfully created",
            data: {
                id: newPost.id,
                user_id: newPost.user_id,
                content: newPost.content,
                image_url: newPost.image_url,
                createdAt: newPost.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to create post",
            error: error.message
        });
    }
};


const deletePost = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Post.destroy({ where: { id } });
        if (result) {
            res.status(200).json({
                success: true,
                message: "Post successfully deleted",
                data: { id }
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to delete post",
            error: error.message
        });
    }
};

module.exports = { getPosts, createPost, deletePost };
