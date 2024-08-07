const { User, UserProfile } = require('../models');

const getUsers = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const users = await User.findAndCountAll({
            limit: parseInt(limit, 10),
            offset: (page - 1) * limit
        });

        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${users.rows.length} user(s)`,
            total_users: users.count,
            page: parseInt(page, 10),
            total_pages: Math.ceil(users.count / limit),
            timestamp: new Date().toISOString(),
            data: users.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const getUserProfiles = async (req, res) => {
    const { user_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
        const profiles = await UserProfile.findAndCountAll({
            where: { user_id },
            limit: parseInt(limit, 10),
            offset: (page - 1) * limit
        });

        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${profiles.rows.length} profile(s) for user ${user_id}`,
            total_profiles: profiles.count,
            page: parseInt(page, 10),
            total_pages: Math.ceil(profiles.count / limit),
            timestamp: new Date().toISOString(),
            data: profiles.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const getUserProfileById = async (req, res) => {
    const { user_id, id } = req.params;

    try {
        const profile = await UserProfile.findOne({ where: { user_id, id } });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found",
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile retrieved successfully",
            timestamp: new Date().toISOString(),
            data: profile
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const upsertUserProfile = async (req, res) => {
    const { user_id, id } = req.params;
    const { full_name, bio } = req.body;
    const profile_picture_url = req.file ? req.file.path : null;

    if (!user_id || !id) {
        return res.status(400).json({
            success: false,
            message: "User ID and Profile ID are required",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const [profile, created] = await UserProfile.upsert(
            {
                id,
                user_id,
                full_name,
                bio,
                profile_picture_url
            },
            {
                returning: true
            }
        );

        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? "Profile created successfully" : "Profile updated successfully",
            timestamp: new Date().toISOString(),
            data: profile
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const deleteUserProfile = async (req, res) => {
    const { user_id, id } = req.params;

    if (!user_id || !id) {
        return res.status(400).json({
            success: false,
            message: "User ID and Profile ID are required",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const result = await UserProfile.destroy({ where: { user_id, id } });

        if (result) {
            res.status(200).json({
                success: true,
                message: "Profile deleted successfully",
                timestamp: new Date().toISOString(),
                data: { user_id, id }
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Profile not found",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    getUsers,
    getUserProfiles,
    getUserProfileById,
    upsertUserProfile,
    deleteUserProfile
};
