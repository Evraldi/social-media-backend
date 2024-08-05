const { Post, Like } = require('../models');

const getLikesByPostId = async (req, res) => {
    const { post_id } = req.params;

    try {
        const post = await Post.findByPk(post_id, {
            include: {
                model: Like,
                attributes: ['user_id']
            },
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${post.Likes.length} like(s) for post ID ${post_id}`,
            timestamp: new Date().toISOString(),
            data: post.Likes,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const likePost = async (req, res) => {
    const { post_id, user_id } = req.body;

    try {
        const existingLike = await Like.findOne({ where: { post_id, user_id } });

        if (existingLike) {
            return res.status(409).json({
                success: false,
                message: "User already liked this post",
                timestamp: new Date().toISOString()
            });
        }

        const newLike = await Like.create({ post_id, user_id });

        res.status(201).json({
            success: true,
            message: "Post successfully liked",
            timestamp: new Date().toISOString(),
            data: {
                id: newLike.id,
                post_id: newLike.post_id,
                user_id: newLike.user_id,
                createdAt: newLike.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const unlikePost = async (req, res) => {
    const { post_id, user_id } = req.body;

    try {
        const result = await Like.destroy({ where: { post_id, user_id } });

        if (result) {
            res.status(200).json({
                success: true,
                message: "Post successfully unliked",
                timestamp: new Date().toISOString(),
                data: {
                    post_id,
                    user_id
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Like not found",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = { likePost, unlikePost, getLikesByPostId };
