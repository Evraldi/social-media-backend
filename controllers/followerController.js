const { Follower } = require('../models');

const followUser = async (req, res) => {
    const { follower_id, following_id } = req.body;
    try {
        const newFollow = await Follower.create({ follower_id, following_id });
        res.status(201).json({
            success: true,
            message: "User followed successfully",
            data: newFollow
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to follow user",
            error: error.message
        });
    }
};

const unfollowUser = async (req, res) => {
    const { follower_id, following_id } = req.body;
    try {
        const result = await Follower.destroy({ where: { follower_id, following_id } });
        if (result) {
            res.status(200).json({
                success: true,
                message: "User unfollowed"
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Follow relationship not found"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to unfollow user",
            error: error.message
        });
    }
};

module.exports = { followUser, unfollowUser };
