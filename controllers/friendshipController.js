const { Friendship, User } = require('../models');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ForbiddenError, ConflictError } = require('../utils/customErrors');

/**
 * Get friend requests for a user
 * @route GET /api/users/:user_id/friend-requests
 */
const getFriendRequests = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
        throw new NotFoundError("User not found");
    }

    // Get total count for pagination
    const totalRequests = await Friendship.countDocuments({
        receiver: user_id,
        status: 'pending'
    });

    // Get friend requests with pagination
    const friendRequests = await Friendship.find({
        receiver: user_id,
        status: 'pending'
    })
        .populate('requester', 'username')
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: friendRequests.length > 0 ? "Friend requests retrieved successfully" : "No friend requests found",
        timestamp: new Date().toISOString(),
        data: friendRequests,
        pagination: getPaginationMetadata(totalRequests, page, limit)
    });
});

/**
 * Get friends for a user
 * @route GET /api/users/:user_id/friends
 */
const getFriends = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
        throw new NotFoundError("User not found");
    }

    // Get total count for pagination
    const totalFriends = await Friendship.countDocuments({
        $or: [
            { requester: user_id, status: 'accepted' },
            { receiver: user_id, status: 'accepted' }
        ]
    });

    // Get friends with pagination
    const friendships = await Friendship.find({
        $or: [
            { requester: user_id, status: 'accepted' },
            { receiver: user_id, status: 'accepted' }
        ]
    })
        .populate('requester', 'username')
        .populate('receiver', 'username')
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: friendships.length > 0 ? "Friends retrieved successfully" : "No friends found",
        timestamp: new Date().toISOString(),
        data: friendships,
        pagination: getPaginationMetadata(totalFriends, page, limit)
    });
});

/**
 * Send a friend request
 * @route POST /api/users/:user_id/friend-requests
 */
const sendFriendRequest = asyncHandler(async (req, res) => {
    const { user_id } = req.params; // User to send friend request to
    const requester_id = req.user._id; // Current authenticated user

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Prevent self-friending
    if (requester_id.toString() === user_id) {
        throw new BadRequestError("You cannot send friend request to yourself");
    }

    // Check if user to send request to exists
    const receiver = await User.findById(user_id);
    if (!receiver) {
        throw new NotFoundError("User not found");
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
        $or: [
            { requester: requester_id, receiver: user_id },
            { requester: user_id, receiver: requester_id }
        ]
    });

    if (existingFriendship) {
        throw new ConflictError("A friend request already exists between these users");
    }

    // Create new friendship
    const newFriendship = new Friendship({
        requester: requester_id,
        receiver: user_id,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
    });

    await newFriendship.save();

    res.status(201).json({
        success: true,
        message: "friend request sent",
        timestamp: new Date().toISOString(),
        data: newFriendship
    });
});

/**
 * Accept a friend request
 * @route PUT /api/friend-requests/:id/accept
 */
const acceptFriendRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user_id = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid friendship ID format");
    }

    // Find the friend request
    const friendship = await Friendship.findById(id);

    if (!friendship) {
        throw new NotFoundError("Friend request not found");
    }

    // Check if the authenticated user is the receiver of the request
    if (friendship.receiver.toString() !== user_id.toString()) {
        throw new ForbiddenError("You are not authorized to accept this friend request");
    }

    // Check if the request is pending
    if (friendship.status !== 'pending') {
        throw new BadRequestError("This friend request has already been processed");
    }

    // Update the friend request status
    friendship.status = 'accepted';
    friendship.updated_at = new Date();
    await friendship.save();

    res.status(200).json({
        success: true,
        message: "Friend request accepted",
        timestamp: new Date().toISOString(),
        data: friendship
    });
});

/**
 * Reject a friend request
 * @route PUT /api/friend-requests/:id/reject
 */
const rejectFriendRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user_id = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid friendship ID format");
    }

    // Find the friend request
    const friendship = await Friendship.findById(id);

    if (!friendship) {
        throw new NotFoundError("Friend request not found");
    }

    // Check if the authenticated user is the receiver of the request
    if (friendship.receiver.toString() !== user_id.toString()) {
        throw new ForbiddenError("You are not authorized to reject this friend request");
    }

    // Check if the request is pending
    if (friendship.status !== 'pending') {
        throw new BadRequestError("This friend request has already been processed");
    }

    // Update the friend request status
    friendship.status = 'rejected';
    friendship.updated_at = new Date();
    await friendship.save();

    res.status(200).json({
        success: true,
        message: "Friend request rejected successfully",
        timestamp: new Date().toISOString(),
        data: friendship
    });
});

/**
 * Remove a friendship
 * @route DELETE /api/friendships/:id
 */
const removeFriendship = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user_id = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid friendship ID format");
    }

    // Find the friendship
    const friendship = await Friendship.findById(id);

    if (!friendship) {
        throw new NotFoundError("Friendship not found");
    }

    // Check if the authenticated user is part of the friendship
    if (friendship.requester.toString() !== user_id.toString() &&
        friendship.receiver.toString() !== user_id.toString()) {
        throw new ForbiddenError("You are not authorized to remove this friendship");
    }

    // Delete the friendship
    await Friendship.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Friendship removed successfully",
        timestamp: new Date().toISOString(),
        data: { _id: id }
    });
});

/**
 * Get pending friend requests for the authenticated user
 * @route GET /api/friend-requests
 */
const getPendingFriendRequests = asyncHandler(async (req, res) => {
    const user_id = req.user._id;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Get total count for pagination
    const totalRequests = await Friendship.countDocuments({
        receiver: user_id,
        status: 'pending'
    });

    // Get paginated friend requests
    const friendRequests = await Friendship.find({
        receiver: user_id,
        status: 'pending'
    })
        .populate('requester', 'username')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: `Successfully retrieved ${friendRequests.length} friend request(s)`,
        timestamp: new Date().toISOString(),
        data: friendRequests,
        pagination: getPaginationMetadata(totalRequests, page, limit)
    });
});

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship,
    getFriends,
    getFriendRequests,
    getPendingFriendRequests
};
