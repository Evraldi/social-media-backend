const { Friendship } = require('../models');

const sendFriendRequest = async (req, res) => {
    const { requester_id, receiver_id } = req.body;
    try {
        const newFriendship = await Friendship.create({ requester_id, receiver_id });
        res.status(201).json({
            success: true,
            message: "Friend request sent successfully",
            data: newFriendship
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to send friend request",
            error: error.message
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
                data: friendship
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Friendship not found"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to accept friend request",
            error: error.message
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
                message: "Friendship deleted"
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Friendship not found"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete friendship",
            error: error.message
        });
    }
};

module.exports = { sendFriendRequest, acceptFriendRequest, deleteFriendship };
