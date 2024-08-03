const { User, UserProfile } = require('../models');
const bcrypt = require('bcrypt');

const getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${users.length} user(s)`,
            data: users,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        //console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const createUser = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists",
                timestamp: new Date().toISOString()
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, email, password: hashedPassword });
        res.status(201).json({
            success: true,
            message: "User successfully created",
            timestamp: new Date().toISOString(),
            data: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        //console.error(error);
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
            data: profiles,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        //console.error(error);
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
            data: profile,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        //console.error(error);
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

        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? "Profile created successfully" : "Profile updated successfully",
            data: profile,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        //console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

const deleteUserProfile = async (req, res) => {
    const { user_id } = req.params;
    try {
        const result = await UserProfile.destroy({ where: { user_id } });
        if (result) {
            res.status(200).json({
                success: true,
                message: "Profile deleted successfully",
                data: { user_id },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Profile not found",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        //console.error(error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = { 
    getUsers,
    createUser,
    getUserProfiles,
    getUserProfileById,
    upsertUserProfile,
    deleteUserProfile
};
