const { User, UserProfile } = require('../models');

const getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${users.length} user(s)`,
            total_users: users.length,
            timestamp: new Date().toISOString(),
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const getUserProfiles = async (req, res) => {
    try {
        const profiles = await UserProfile.findAll();
        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${profiles.length} profile(s)`,
            total_profiles: profiles.length,
            timestamp: new Date().toISOString(),
            data: profiles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const getUserProfileById = async (req, res) => {
    const { user_id } = req.params;

    try {
        const profile = await UserProfile.findOne({ where: { user_id } });

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
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const upsertUserProfile = async (req, res) => {
    const { user_id, full_name, bio, profile_picture_url } = req.body;

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "User ID is required",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const [profile, created] = await UserProfile.upsert(
            {
                user_id,
                full_name,
                bio,
                profile_picture_url
            },
            {
                where: { user_id },
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
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const deleteUserProfile = async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "User ID is required",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const result = await UserProfile.destroy({ where: { user_id } });

        if (result) {
            res.status(200).json({
                success: true,
                message: "Profile deleted successfully",
                timestamp: new Date().toISOString(),
                data: user_id
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Profile not found",
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
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
