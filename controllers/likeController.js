const { Like } = require('../models');

// Like a post
const likePost = async (req, res) => {
    const { post_id, user_id } = req.body;
    try {
        const newLike = await Like.create({ post_id, user_id });
        res.status(201).json(newLike);
    } catch (error) {
        res.status(500).json({ error: "Failed to like post" });
    }
};

// Unlike a post
const unlikePost = async (req, res) => {
    const { post_id, user_id } = req.body;
    try {
        const result = await Like.destroy({ where: { post_id, user_id } });
        if (result) {
            res.status(200).json({ message: "Post unliked" });
        } else {
            res.status(404).json({ error: "Like not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to unlike post" });
    }
};

module.exports = { likePost, unlikePost };
