const { Comment, User, UserProfile, Post } = require('../models');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

/**
 * Get comments for a specific post
 * @route GET /api/posts/:post_id/comments
 */
const getComments = asyncHandler(async (req, res) => {
    const { post_id } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);
    const { sort = 'created_at', order = 'desc' } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(post_id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    // Convert string ID to ObjectId for better performance
    const postObjectId = new mongoose.Types.ObjectId(post_id);

    // Define projection to limit returned fields
    const projection = {
        content: 1,
        created_at: 1,
        user: 1,
        post: 1,
        likes_count: 1,
        parent_id: 1
    };

    // Define sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Use Promise.all to run queries in parallel
    const [post, totalComments, comments] = await Promise.all([
        // Check if post exists with minimal projection
        Post.findById(postObjectId).select('_id').lean(),

        // Get total count for pagination
        Comment.countDocuments({ post: postObjectId }),

        // Get paginated comments with optimized query
        Comment.find({ post: postObjectId }, projection)
            .populate('user', 'username')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean() // Convert to plain JS objects for better performance
    ]);

    if (!post) {
        throw new NotFoundError("Post not found");
    }

    res.status(200).json({
        success: true,
        message: `Successfully retrieved ${comments.length} comment(s) for post ${post_id}`,
        timestamp: new Date().toISOString(),
        data: comments,
        pagination: getPaginationMetadata(totalComments, page, limit)
    });
});

/**
 * Create a new comment
 * @route POST /api/posts/:post_id/comments
 */
const createComment = asyncHandler(async (req, res) => {
    const { post_id } = req.params;
    const { content } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(post_id)) {
        throw new BadRequestError("Invalid post ID format");
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
        throw new NotFoundError("Post not found");
    }

    // Create new comment
    const newComment = new Comment({
        post: post_id,
        user: req.user._id,
        content
    });

    await newComment.save();

    res.status(201).json({
        success: true,
        message: "Comment successfully created",
        timestamp: new Date().toISOString(),
        data: {
            _id: newComment._id,
            post: newComment.post,
            user: newComment.user,
            content: newComment.content,
            created_at: newComment.created_at
        }
    });
});

/**
 * Delete a comment
 * @route DELETE /api/comments/:id
 */
const deleteComment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid comment ID format");
    }

    // Find the comment first
    const comment = await Comment.findById(id);

    if (!comment) {
        throw new NotFoundError("Comment not found");
    }

    // Check if user is authorized to delete this comment
    // Allow if user is the comment author or the post owner
    const post = await Post.findById(comment.post);

    if (!post) {
        throw new NotFoundError("Associated post not found");
    }

    const isCommentAuthor = comment.user.toString() === req.user._id.toString();
    const isPostOwner = post.user.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostOwner) {
        throw new ForbiddenError("Forbidden: You are not authorized to delete this comment");
    }

    // Delete the comment
    await Comment.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Comment successfully deleted",
        timestamp: new Date().toISOString(),
        data: { _id: id }
    });
});

/**
 * Update a comment
 * @route PUT /api/comments/:id
 */
const updateComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid comment ID format");
    }

    // Find the comment first
    const comment = await Comment.findById(id);

    if (!comment) {
        throw new NotFoundError("Comment not found");
    }

    // Check if user is authorized to update this comment
    // Only allow if user is the comment author
    if (comment.user.toString() !== req.user._id.toString()) {
        throw new ForbiddenError("Forbidden: You are not authorized to update this comment");
    }

    // Update the comment
    const updatedComment = await Comment.findByIdAndUpdate(
        id,
        { content },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: "Comment successfully updated",
        timestamp: new Date().toISOString(),
        data: updatedComment
    });
});

module.exports = { getComments, createComment, deleteComment, updateComment };
