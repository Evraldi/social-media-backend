const { Post } = require('../models');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

/**
 * Get all posts with pagination
 * @route GET /api/posts
 */
const getPosts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const { sort = 'created_at', order = 'desc' } = req.query;

    // Only show public posts to unauthenticated users
    const filter = { visibility: 'public' };

    // Define projection to limit returned fields
    const projection = {
        content: 1,
        image_url: 1,
        visibility: 1,
        created_at: 1,
        likes_count: 1,
        comments_count: 1,
        user: 1
    };

    // Define sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Use Promise.all to run queries in parallel
    const [totalPosts, posts] = await Promise.all([
        // Get total count for pagination
        Post.countDocuments(filter),

        // Get paginated posts with optimized query
        Post.find(filter, projection)
            .populate('user', 'username')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean() // Convert to plain JS objects for better performance
    ]);

    res.status(200).json({
        success: true,
        message: `Successfully retrieved ${posts.length} post(s)`,
        timestamp: new Date().toISOString(),
        data: posts,
        pagination: getPaginationMetadata(totalPosts, page, limit)
    });
});

/**
 * Get posts by user ID
 * @route GET /api/users/:user_id/posts
 */
const getPostsByUserId = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);
    const { sort = 'created_at', order = 'desc' } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Only show public posts to unauthenticated users or other users
    // Show all posts to the authenticated user viewing their own posts
    const isOwnProfile = req.user && req.user._id.toString() === user_id;

    const filter = {
        user: new mongoose.Types.ObjectId(user_id), // Convert to ObjectId for better performance
        ...(isOwnProfile ? {} : { visibility: 'public' })
    };

    // Define projection to limit returned fields
    const projection = {
        content: 1,
        image_url: 1,
        visibility: 1,
        created_at: 1,
        likes_count: 1,
        comments_count: 1,
        user: 1
    };

    // Define sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Use Promise.all to run queries in parallel
    const [totalPosts, posts] = await Promise.all([
        // Get total count for pagination
        Post.countDocuments(filter),

        // Get paginated posts with optimized query
        Post.find(filter, projection)
            .populate('user', 'username')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean() // Convert to plain JS objects for better performance
    ]);

    res.status(200).json({
        success: true,
        message: `Successfully retrieved ${posts.length} post(s) for user ID ${user_id}`,
        timestamp: new Date().toISOString(),
        data: posts,
        pagination: getPaginationMetadata(totalPosts, page, limit)
    });
});

/**
 * Get post by ID
 * @route GET /api/posts/:id
 */
const getPostById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    // Define projection to limit returned fields
    const projection = {
        content: 1,
        image_url: 1,
        visibility: 1,
        created_at: 1,
        likes_count: 1,
        comments_count: 1,
        user: 1
    };

    // Check if the post exists with a single query that also populates user data
    const post = await Post.findById(id, projection)
        .populate('user', 'username')
        .lean(); // Convert to plain JS object for better performance

    if (!post) {
        throw new NotFoundError('Post not found');
    }

    // Check if the post is private and the user is not the owner
    if (post.visibility === 'private') {
        if (!req.user) {
            // No user is authenticated, deny access to private post
            throw new NotFoundError('Post not found');
        }

        if (req.user._id.toString() !== post.user._id.toString()) {
            // User is not the owner of the private post
            throw new NotFoundError('Post not found');
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully retrieved post with ID ${id}`,
        timestamp: new Date().toISOString(),
        data: post
    });
});

/**
 * Create a new post
 * @route POST /api/posts
 */
const createPost = asyncHandler(async (req, res) => {
    const { content, visibility } = req.body;
    const file = req.file;

    // Handle image upload
    let image_url = null;
    if (file) {
        image_url = file.path;
    }

    // Create new post
    const newPost = new Post({
        user: req.user._id,
        visibility: visibility || 'public',
        content,
        image_url
    });

    await newPost.save();

    res.status(201).json({
        success: true,
        message: "Post successfully created",
        timestamp: new Date().toISOString(),
        data: {
            _id: newPost._id,
            user: newPost.user.toString(),
            content: newPost.content,
            image_url: newPost.image_url,
            visibility: newPost.visibility,
            created_at: newPost.created_at
        }
    });
});

/**
 * Update a post
 * @route PUT /api/posts/:id
 */
const updatePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, visibility } = req.body;
    const file = req.file;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    // Check if post exists
    const post = await Post.findById(id);
    if (!post) {
        throw new NotFoundError("Post not found");
    }

    // Check if user is authorized to update this post
    if (post.user.toString() !== req.user._id.toString()) {
        throw new ForbiddenError("Forbidden: You are not authorized to update this post");
    }

    // Handle image update
    let image_url = post.image_url;
    if (file) {
        if (image_url) {
            const oldImagePath = path.resolve(__dirname, '../', image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        image_url = file.path;
    }

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
        id,
        { content, image_url, visibility },
        { new: true, runValidators: true }
    ).populate('user', 'username');

    res.status(200).json({
        success: true,
        message: "Post successfully updated",
        timestamp: new Date().toISOString(),
        data: updatedPost
    });
});

/**
 * Delete a post
 * @route DELETE /api/posts/:id
 */
const deletePost = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    // Check if post exists
    const post = await Post.findById(id);
    if (!post) {
        throw new NotFoundError("Post not found");
    }

    // Check if user is authorized to delete this post
    if (post.user.toString() !== req.user._id.toString()) {
        throw new ForbiddenError("Forbidden: You are not authorized to delete this post");
    }

    // Delete image file if exists
    if (post.image_url) {
        const imagePath = path.resolve(__dirname, '../', post.image_url);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }

    // Delete post
    await Post.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Post successfully deleted",
        timestamp: new Date().toISOString(),
        data: { id }
    });
});

module.exports = {
    getPosts,
    createPost,
    deletePost,
    updatePost,
    getPostsByUserId,
    getPostById
};
