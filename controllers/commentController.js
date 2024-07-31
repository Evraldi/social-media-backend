const { Comment, User, Post } = require('../models');

const getComments = async (req, res) => {
    const { post_id } = req.params;
    try {
        const comments = await Comment.findAll({
            where: { post_id },
            include: [User]
        });
        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${comments.length} comment(s) for post ${post_id}`,
            data: comments
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve comments",
            error: error.message
        });
    }
};

const createComment = async (req, res) => {
    const { post_id, user_id, content } = req.body;
    try {

        const post = await Post.findByPk(post_id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        const user = await User.findByPk(user_id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const newComment = await Comment.create({ post_id, user_id, content });
        res.status(201).json({
            success: true,
            message: "Comment successfully created",
            data: {
                id: newComment.id,
                post_id: newComment.post_id,
                user_id: newComment.user_id,
                content: newComment.content,
                createdAt: newComment.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to create comment",
            error: error.message
        });
    }
};

const deleteComment = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Comment.destroy({ where: { id } });
        if (result) {
            res.status(200).json({
                success: true,
                message: "Comment successfully deleted",
                data: { id }
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to delete comment",
            error: error.message
        });
    }
};

const updateComment = async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    try {
        const [updated] = await Comment.update(
            { content },
            { where: { id } }
        );
        if (updated) {
            const updatedComment = await Comment.findByPk(id);
            res.status(200).json({
                success: true,
                message: "Comment successfully updated",
                data: updatedComment
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update comment",
            error: error.message
        });
    }
};


module.exports = { getComments, createComment, deleteComment, updateComment };
