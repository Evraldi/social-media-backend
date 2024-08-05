const { Follower } = require('../models');

const followUser = async (req, res) => {
    const { follower_id, following_id } = req.body;

    try {
        const newFollow = await Follower.create({ follower_id, following_id });

        res.status(201).json({
            success: true,
            message: "User followed successfully",
            timestamp: new Date().toISOString(),
            data: newFollow
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

const unfollowUser = async (req, res) => {
    const { follower_id, following_id } = req.body;

    try {
        const result = await Follower.destroy({ where: { follower_id, following_id } });

        if (result) {
            res.status(200).json({
                success: true,
                message: "User unfollowed",
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Follow relationship not found",
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

module.exports = { followUser, unfollowUser };
