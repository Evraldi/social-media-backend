const { Follower, User } = require('../models');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/customErrors');

/**
 * Get followers for a user
 * @route GET /api/users/:user_id/followers
 */
const getFollowersByUserId = asyncHandler(async (req, res) => {
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
    const totalFollowers = await Follower.countDocuments({ following: user_id });

    // Get followers with pagination
    const followers = await Follower.find({ following: user_id })
        .populate('follower', 'username')
        .skip(skip)
        .limit(limit);

    const message = followers.length > 0 ? "Followers retrieved successfully" : "No followers found for this user";

    res.status(200).json({
        success: true,
        message,
        timestamp: new Date().toISOString(),
        data: followers,
        pagination: getPaginationMetadata(totalFollowers, page, limit)
    });
});

/**
 * Get following for a user
 * @route GET /api/users/:user_id/following
 */
const getFollowingByUserId = asyncHandler(async (req, res) => {
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
    const totalFollowing = await Follower.countDocuments({ follower: user_id });

    // Get following with pagination
    const following = await Follower.find({ follower: user_id })
        .populate('following', 'username')
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: following.length > 0 ? "Following retrieved successfully" : "User is not following anyone",
        timestamp: new Date().toISOString(),
        data: following,
        pagination: getPaginationMetadata(totalFollowing, page, limit)
    });
});

/**
 * Follow a user
 * @route POST /api/users/:user_id/follow
 */
const followUser = asyncHandler(async (req, res) => {
    const { user_id } = req.params; // User to follow
    const follower_id = req.user._id; // Current authenticated user

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Prevent self-following
    if (follower_id.toString() === user_id) {
        throw new BadRequestError("You cannot follow yourself");
    }

    // Check if user to follow exists
    const userToFollow = await User.findById(user_id);
    if (!userToFollow) {
        throw new NotFoundError("User not found");
    }

    // Check if already following
    const existingFollow = await Follower.findOne({ follower: follower_id, following: user_id });
    if (existingFollow) {
        throw new ConflictError("You are already following this user");
    }

    // Create follow relationship
    const newFollow = new Follower({
        follower: follower_id,
        following: user_id
    });

    await newFollow.save();

    res.status(201).json({
        success: true,
        message: "Now following this user successfully",
        timestamp: new Date().toISOString(),
        data: newFollow
    });
});

/**
 * Unfollow a user
 * @route DELETE /api/users/:user_id/follow
 */
const unfollowUser = asyncHandler(async (req, res) => {
    const { user_id } = req.params; // User to unfollow
    const follower_id = req.user._id; // Current authenticated user

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Check if user to unfollow exists
    const userToUnfollow = await User.findById(user_id);
    if (!userToUnfollow) {
        throw new NotFoundError("User not found");
    }

    // Find and delete follow relationship
    const result = await Follower.findOneAndDelete({ follower: follower_id, following: user_id });

    if (result) {
        res.status(200).json({
            success: true,
            message: "User unfollowed successfully",
            timestamp: new Date().toISOString(),
            data: result
        });
    } else {
        throw new NotFoundError("You are not following this user");
    }
});

module.exports = { followUser, unfollowUser, getFollowersByUserId, getFollowingByUserId };
