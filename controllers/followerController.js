const { Follower, User } = require('../models');

const getFollowersByUserId = async (req, res) => {
    const { user_id } = req.params;

    try {
        const followers = await Follower.findAll({
            where: { following_id: user_id },
            include: [
                {
                    model: User,
                    as: 'FollowerUser',
                    attributes: []
                }
            ],
            attributes: ['id', 'follower_id', 'following_id']
        });

        if (followers.length > 0) {
            res.status(200).json({
                success: true,
                message: "Followers retrieved successfully",
                timestamp: new Date().toISOString(),
                data: followers
            });
        } else {
            res.status(404).json({
                success: false,
                message: "No followers found for this user",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error retrieving followers:', error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

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

module.exports = { followUser, unfollowUser, getFollowersByUserId };
