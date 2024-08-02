const { Post, User } = require('../models');
const path = require('path');
const fs = require('fs');


const getPostsByUserId = async (req, res) => {
    const { user_id } = req.params;

    try {
        const posts = await Post.findAll({
            where: { user_id },
            include: User,
            order: [['created_at', 'DESC']],
        });

        if (!posts.length) {
            return res.status(404).json({
                success: false,
                message: 'No posts found for this user',
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${posts.length} post(s) for user ID ${user_id}`,
            data: posts,
        });
    } catch (error) {
        console.error('Error retrieving posts by user ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve posts',
            error: error.message,
        });
    }
};

const getPostById = async (req, res) => {
    const { id } = req.params;

    try {
        const post = await Post.findByPk(id, {
            include: User,
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found',
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully retrieved post with ID ${id}`,
            data: post,
        });
    } catch (error) {
        console.error('Error retrieving post by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve post',
            error: error.message,
        });
    }
};

const getPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: User,
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${posts.length} post(s)`,
            data: posts
        });
    } catch (error) {
        console.error('Error retrieving posts:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve posts",
            error: error.message
        });
    }
};

const createPost = async (req, res) => {
    const { user_id, content } = req.body;
    const file = req.file;

    try {
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        let image_url = null;
        if (file) {
            image_url = file.path;
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
        console.error('Error creating post:', error);
        res.status(500).json({
            success: false,
            message: "Failed to create post",
            error: error.message
        });
    }
};

const updatePost = async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const file = req.file;

    try {
        const post = await Post.findByPk(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        let image_url = post.image_url;
        if (file) {
            if (image_url) {
                const oldImagePath = path.resolve(__dirname, '../', image_url);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            image_url = file.path;
        }

        const [updated] = await Post.update(
            { content, image_url },
            { where: { id } }
        );

        if (updated) {
            const updatedPost = await Post.findByPk(id);
            res.status(200).json({
                success: true,
                message: "Post successfully updated",
                data: updatedPost
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update post",
            error: error.message
        });
    }
};

const deletePost = async (req, res) => {
    const { id } = req.params;
    try {
        const post = await Post.findByPk(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        if (post.image_url) {
            const imagePath = path.resolve(__dirname, '../', post.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Post.destroy({ where: { id } });
        res.status(200).json({
            success: true,
            message: "Post successfully deleted",
            data: { id }
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({
            success: false,
            message: "Failed to delete post",
            error: error.message
        });
    }
};

module.exports = { getPosts, createPost, deletePost, updatePost, getPostsByUserId, getPostById };
