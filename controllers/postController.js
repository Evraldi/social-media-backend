const { Post, User, UserProfile } = require('../models');
const path = require('path');
const fs = require('fs');

const getPostsByUserId = async (req, res) => {
    const { user_id } = req.params;

    try {
        const posts = await Post.findAll({
            where: { user_id },
            include: {
                model: UserProfile,
                attributes: ['full_name', 'profile_picture_url'],
            },
            order: [['created_at', 'DESC']],
        });

        if (!posts.length) {
            return res.status(404).json({
                success: false,
                message: 'No posts found for this user',
                timestamp: new Date().toISOString(),
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${posts.length} post(s) for user ID ${user_id}`,
            timestamp: new Date().toISOString(),
            data: posts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString(),
        });
    }
};

const getPostById = async (req, res) => {
    const { id } = req.params;

    try {
        const post = await Post.findByPk(id, {
            include: {
                model: UserProfile,
                attributes: ['full_name', 'profile_picture_url'],
            },
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found',
                timestamp: new Date().toISOString(),
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully retrieved post with ID ${id}`,
            timestamp: new Date().toISOString(),
            data: post,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString(),
        });
    }
};

const getPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: {
                model: UserProfile,
                attributes: ['full_name', 'profile_picture_url'],
            },
            order: [['created_at', 'DESC']],
        });

        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${posts.length} post(s)`,
            timestamp: new Date().toISOString(),
            data: posts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString(),
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
                message: "User not found",
                timestamp: new Date().toISOString(),
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
            timestamp: new Date().toISOString(),
            data: {
                id: newPost.id,
                user_id: newPost.user_id,
                content: newPost.content,
                image_url: newPost.image_url,
                createdAt: newPost.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString(),
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
                message: "Post not found",
                timestamp: new Date().toISOString(),
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

        const [updated] = await Post.update({ content, image_url }, { where: { id } });

        if (updated) {
            const updatedPost = await Post.findByPk(id);
            res.status(200).json({
                success: true,
                message: "Post successfully updated",
                timestamp: new Date().toISOString(),
                data: updatedPost,
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Post not found",
                timestamp: new Date().toISOString(),
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString(),
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
                message: "Post not found",
                timestamp: new Date().toISOString(),
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
            timestamp: new Date().toISOString(),
            data: { id },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString(),
        });
    }
};

module.exports = { getPosts, createPost, deletePost, updatePost, getPostsByUserId, getPostById };
