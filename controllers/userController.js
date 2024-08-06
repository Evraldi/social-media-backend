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
    const { page = 1, limit = 10 } = req.query;

    try {
        const profiles = await UserProfile.findAndCountAll({
            limit: parseInt(limit, 10),
            offset: (page - 1) * limit
        });
        
        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${profiles.rows.length} profile(s)`,
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
    const { id } = req.params;

    try {
        const profile = await UserProfile.findOne({ where: { user_id: id } });

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
    const { id } = req.params;
    const { full_name, bio, profile_picture_url } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "User ID is required",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const [profile, created] = await UserProfile.upsert(
            {
                user_id: id,
                full_name,
                bio,
                profile_picture_url
            },
            {
                returning: true
            }
        );

        const data = {
            user_id: profile.user_id,
            full_name: profile.full_name,
            bio: profile.bio,
            profile_picture_url: profile.profile_picture_url,
            created_at: profile.created_at
        };

        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? "Profile created successfully" : "Profile updated successfully",
            timestamp: new Date().toISOString(),
            data
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
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "User ID is required",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const result = await UserProfile.destroy({ where: { user_id: id } });

        if (result) {
            res.status(200).json({
                success: true,
                message: "Profile deleted successfully",
                timestamp: new Date().toISOString(),
                data: id
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
