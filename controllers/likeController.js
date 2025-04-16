const { Post, Like } = require('../models');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/customErrors');

/**
 * Get likes for a specific post
 * @route GET /api/posts/:post_id/likes
 */
const getLikes = asyncHandler(async (req, res) => {
    const { post_id } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(post_id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
        throw new NotFoundError("Post not found");
    }

    // Get total count for pagination
    const totalLikes = await Like.countDocuments({ post: post_id });

    // Get paginated likes
    const likes = await Like.find({ post: post_id })
        .populate('user', 'username')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: `Successfully retrieved ${likes.length} like(s) for post ID ${post_id}`,
        timestamp: new Date().toISOString(),
        data: likes,
        pagination: getPaginationMetadata(totalLikes, page, limit)
    });
});

/**
 * Like a post
 * @route POST /api/posts/:post_id/likes
 */
const createLike = asyncHandler(async (req, res) => {
    const { post_id } = req.params;
    const user_id = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(post_id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
        throw new NotFoundError("Post not found");
    }

    // Check if like already exists
    const existingLike = await Like.findOne({ post: post_id, user: user_id });
    if (existingLike) {
        throw new ConflictError("You have already liked this post");
    }

    // Create new like
    const newLike = new Like({
        post: post_id,
        user: user_id
    });

    await newLike.save();

    res.status(201).json({
        success: true,
        message: "Post liked successfully",
        timestamp: new Date().toISOString(),
        data: newLike
    });
});

/**
 * Unlike a post
 * @route DELETE /api/posts/:post_id/likes
 */
const deleteLike = asyncHandler(async (req, res) => {
    const { post_id } = req.params;
    const user_id = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(post_id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
        throw new NotFoundError("Post not found");
    }

    // Find and delete the like
    const like = await Like.findOneAndDelete({ post: post_id, user: user_id });

    if (!like) {
        throw new NotFoundError("Like not found. You haven't liked this post.");
    }

    res.status(200).json({
        success: true,
        message: "Post unliked successfully",
        timestamp: new Date().toISOString(),
        data: { _id: like._id }
    });
});

module.exports = { createLike, deleteLike, getLikes };
