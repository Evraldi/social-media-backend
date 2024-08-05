const path = require('path');
const fs = require('fs');
const { Media } = require('../models');

const uploadMedia = async (req, res) => {
    const { user_id, post_id } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({
            success: false,
            message: "No file uploaded",
            timestamp: new Date().toISOString()
        });
    }

    const media_url = path.join('uploads/media', file.filename);
    const media_type = file.mimetype;

    try {
        const newMedia = await Media.create({
            user_id,
            post_id,
            media_url,
            media_type
        });

        res.status(201).json({
            success: true,
            message: "Media uploaded successfully",
            timestamp: new Date().toISOString(),
            data: {
                id: newMedia.id,
                user_id: newMedia.user_id,
                post_id: newMedia.post_id,
                media_url: newMedia.media_url,
                media_type: newMedia.media_type,
                created_at: newMedia.created_at
            }
        });
    } catch (error) {
        console.error(error);
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = { uploadMedia };
