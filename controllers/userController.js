const { User, UserProfile } = require('../models');
const mongoose = require('mongoose');
const { getPaginationOptions, getPaginationMetadata } = require('../utils/pagination');
const path = require('path');
const fs = require('fs');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

/**
 * Get all users with pagination
 * @route GET /api/users
 */
const getUsers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const { search, sort = 'username', order = 'asc' } = req.query;

    // Build query
    let query = {};

    // Add search functionality
    if (search) {
        query = {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };
    }

    // Define projection to limit returned fields
    // Note: MongoDB doesn't allow mixing inclusion and exclusion in the same projection (except for _id)
    // So we'll use exclusion only
    const projection = {
        password: 0 // Exclude password field only
    };

    // Define sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Use Promise.all to run queries in parallel
    const [totalUsers, users] = await Promise.all([
        // Get total count for pagination
        User.countDocuments(query),

        // Get paginated users with optimized query
        User.find(query, projection)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean() // Convert to plain JS objects for better performance
    ]);

    res.status(200).json({
        success: true,
        message: `Successfully retrieved ${users.length} user(s)`,
        timestamp: new Date().toISOString(),
        data: users,
        pagination: getPaginationMetadata(totalUsers, page, limit)
    });
});

/**
 * Get user profiles by user ID
 * @route GET /api/users/:user_id/profiles
 */
const getUserProfiles = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { page, limit, skip } = getPaginationOptions(req.query);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new BadRequestError("Invalid user ID format");
    }

    // Convert string ID to ObjectId for better performance
    const userObjectId = new mongoose.Types.ObjectId(user_id);

    // Check if the authenticated user is the same as the user whose profiles are being accessed
    if (req.user && req.user._id.toString() !== user_id) {
        throw new ForbiddenError("You are not authorized to access these profiles");
    }

    // Use Promise.all to run queries in parallel
    const [user, totalProfiles, profiles] = await Promise.all([
        // Check if user exists
        User.findById(userObjectId).select('_id').lean(),

        // Get total count for pagination
        UserProfile.countDocuments({ user: userObjectId }),

        // Get user profiles with optimized query
        UserProfile.find({ user: userObjectId })
            .skip(skip)
            .limit(limit)
            .lean() // Convert to plain JS objects for better performance
    ]);

    if (!user) {
        throw new NotFoundError("User not found");
    }

    res.status(200).json({
        success: true,
        message: `Successfully retrieved ${profiles.length} profile(s) for user ${user_id}`,
        timestamp: new Date().toISOString(),
        data: profiles,
        pagination: getPaginationMetadata(totalProfiles, page, limit)
    });
});

/**
 * Get user profile by ID
 * @route GET /api/users/:user_id/profiles/:id
 */
const getUserProfileById = asyncHandler(async (req, res) => {
    const { user_id, id } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid ID format");
    }

    // Convert string IDs to ObjectIds for better performance
    const userObjectId = new mongoose.Types.ObjectId(user_id);
    const profileObjectId = new mongoose.Types.ObjectId(id);

    // Check if the authenticated user is the same as the user whose profile is being accessed
    if (req.user && req.user._id.toString() !== user_id) {
        throw new ForbiddenError("You are not authorized to access this profile");
    }

    // Get profile with optimized query
    const profile = await UserProfile.findOne({
        user: userObjectId,
        _id: profileObjectId
    }).lean(); // Convert to plain JS object for better performance

    if (!profile) {
        throw new NotFoundError("Profile not found");
    }

    res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        timestamp: new Date().toISOString(),
        data: profile
    });
});

/**
 * Create or update user profile
 * @route PUT /api/users/:user_id/profiles/:id
 */
const upsertUserProfile = asyncHandler(async (req, res) => {
    const { user_id, id } = req.params;
    const { full_name, bio } = req.body;
    const profile_picture_url = req.file ? req.file.path : null;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid ID format");
    }

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
        throw new NotFoundError("User not found");
    }

    // Check if the authenticated user is the same as the user whose profile is being updated
    if (req.user && req.user._id.toString() !== user_id) {
        throw new ForbiddenError("You are not authorized to update this profile");
    }

    // Check if profile exists
    let profile = await UserProfile.findOne({ user: user_id, _id: id });
    let created = false;

    if (profile) {
        // Update existing profile
        // Handle profile picture update
        if (req.file && profile.profile_picture_url) {
            const oldImagePath = path.resolve(__dirname, '../', profile.profile_picture_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        profile = await UserProfile.findByIdAndUpdate(
            id,
            { full_name, bio, profile_picture_url: profile_picture_url || profile.profile_picture_url },
            { new: true, runValidators: true }
        );
    } else {
        // Create new profile
        profile = new UserProfile({
            _id: id,
            user: user_id,
            full_name,
            bio,
            profile_picture_url
        });
        await profile.save();
        created = true;
    }

    res.status(created ? 201 : 200).json({
        success: true,
        message: created ? "Profile created successfully" : "Profile updated successfully",
        timestamp: new Date().toISOString(),
        data: profile
    });
});

/**
 * Delete user profile
 * @route DELETE /api/users/:user_id/profiles/:id
 */
const deleteUserProfile = asyncHandler(async (req, res) => {
    const { user_id, id } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid ID format");
    }

    // Check if the authenticated user is the same as the user whose profile is being deleted
    if (req.user && req.user._id.toString() !== user_id) {
        throw new ForbiddenError("You are not authorized to delete this profile");
    }

    // Check if profile exists and belongs to user
    const profile = await UserProfile.findOne({ user: user_id, _id: id });

    if (!profile) {
        throw new NotFoundError("Profile not found");
    }

    // Delete profile picture if exists
    if (profile.profile_picture_url) {
        const imagePath = path.resolve(__dirname, '../', profile.profile_picture_url);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }

    // Delete profile
    await UserProfile.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Profile deleted successfully",
        timestamp: new Date().toISOString(),
        data: { user_id, id }
    });
});

module.exports = {
    getUsers,
    getUserProfiles,
    getUserProfileById,
    upsertUserProfile,
    deleteUserProfile
};
