const path = require('path');
const fs = require('fs');
const { Media, User, Post } = require('../models');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

/**
 * Get media by user ID
 * @route GET /api/users/:user_id/media
 */
const getMediaByUserId = asyncHandler(async (req, res) => {
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
    const totalMedia = await Media.countDocuments({ user: user_id });

    // Get media with pagination
    const media = await Media.find({ user: user_id })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: media.length > 0 ? "Media retrieved successfully" : "No media found for this user",
        timestamp: new Date().toISOString(),
        data: media,
        pagination: getPaginationMetadata(totalMedia, page, limit)
    });
});

/**
 * Get media by post ID
 * @route GET /api/posts/:post_id/media
 */
const getMediaByPostId = asyncHandler(async (req, res) => {
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
    const totalMedia = await Media.countDocuments({ post: post_id });

    // Get media with pagination
    const media = await Media.find({ post: post_id })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        message: media.length > 0 ? "Media retrieved successfully" : "No media found for this post",
        timestamp: new Date().toISOString(),
        data: media,
        pagination: getPaginationMetadata(totalMedia, page, limit)
    });
});

/**
 * Upload media
 * @route POST /api/media
 */
const uploadMedia = asyncHandler(async (req, res) => {
    // Get user_id from body or query parameters
    const user_id = req.body.user_id || req.query.user_id;
    const { post_id } = req.body;
    const file = req.file;

    // Validate file
    if (!file) {
        throw new BadRequestError("No file uploaded");
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    if (post_id && !mongoose.Types.ObjectId.isValid(post_id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    try {
        // Check if user exists
        const user = await User.findById(user_id);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Check if post exists if post_id is provided
        if (post_id) {
            const post = await Post.findById(post_id);
            if (!post) {
                throw new NotFoundError("Post not found");
            }
        }

        const media_url = file.path;
        const media_type = file.mimetype;

        // Create new media
        const newMedia = new Media({
            user: user_id,
            post: post_id || null,
            media_url,
            media_type
        });

        await newMedia.save();

        res.status(201).json({
            success: true,
            message: "Media uploaded successfully",
            timestamp: new Date().toISOString(),
            data: newMedia
        });
    } catch (error) {
        // Clean up file if there was an error
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        throw error; // Re-throw the error to be handled by the error middleware
    }
});

/**
 * Get media by ID
 * @route GET /api/media/:id
 */
const getMediaById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid media ID format");
    }

    // Find media
    const media = await Media.findById(id);
    if (!media) {
        throw new NotFoundError("Media not found");
    }

    res.status(200).json({
        success: true,
        message: "Media retrieved successfully",
        timestamp: new Date().toISOString(),
        data: media
    });
});

/**
 * Delete media
 * @route DELETE /api/media/:id
 */
const deleteMedia = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid media ID format");
    }

    // Find media
    const media = await Media.findById(id);
    if (!media) {
        throw new NotFoundError("Media not found");
    }

    // Check if user is authorized to delete this media
    if (req.user && media.user.toString() !== req.user._id.toString()) {
        throw new ForbiddenError("You are not authorized to delete this media");
    }

    // Delete file from filesystem
    if (media.media_url && fs.existsSync(media.media_url)) {
        fs.unlinkSync(media.media_url);
    }

    // Delete media from database
    await Media.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Media deleted successfully",
        timestamp: new Date().toISOString()
    });
});

module.exports = { uploadMedia, getMediaByUserId, getMediaByPostId, getMediaById, deleteMedia };
