const { Comment, Post, User } = require('../models');

const getComments = async (req, res) => {
    const { post_id } = req.params;
    try {
        const comments = await Comment.findAll({
            where: { post_id },
            include: [User]
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve comments" });
    }
};

const createComment = async (req, res) => {
    const { post_id, user_id, content } = req.body;
    try {
        const newComment = await Comment.create({ post_id, user_id, content });
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ error: "Failed to create comment" });
    }
};

const deleteComment = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Comment.destroy({ where: { id } });
        if (result) {
            res.status(200).json({ message: "Comment deleted" });
        } else {
            res.status(404).json({ error: "Comment not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to delete comment" });
    }
};

module.exports = { getComments, createComment, deleteComment };
