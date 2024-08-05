const { Friendship } = require('../models');

const sendFriendRequest = async (req, res) => {
    const { requester_id, receiver_id } = req.body;

    try {
        const newFriendship = await Friendship.create({ requester_id, receiver_id });

        res.status(201).json({
            success: true,
            message: "Friend request sent successfully",
            timestamp: new Date().toISOString(),
            data: newFriendship
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

const acceptFriendRequest = async (req, res) => {
    const { id } = req.params;

    try {
        const friendship = await Friendship.findByPk(id);

        if (friendship) {
            friendship.status = 'accepted';
            await friendship.save();

            res.status(200).json({
                success: true,
                message: "Friend request accepted",
                timestamp: new Date().toISOString(),
                data: friendship
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Friendship not found",
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

const deleteFriendship = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Friendship.destroy({ where: { id } });

        if (result) {
            res.status(200).json({
                success: true,
                message: "Friendship deleted",
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Friendship not found",
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

module.exports = { sendFriendRequest, acceptFriendRequest, deleteFriendship };
