const { User, UserProfile, RefreshToken } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { BadRequestError, NotFoundError, UnauthorizedError, ConflictError, InternalServerError } = require('../utils/customErrors');

const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const publicKeyPath = process.env.PUBLIC_KEY_PATH;

const privateKey = fs.readFileSync(path.resolve(__dirname, '..', privateKeyPath), 'utf8');
const publicKey = fs.readFileSync(path.resolve(__dirname, '..', publicKeyPath), 'utf8');

if (!privateKey || !publicKey) {
    throw new Error('Private key or public key is missing');
}

const verifyToken = (token) => {
    try {
        return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    } catch (err) {
        throw new UnauthorizedError('Invalid token', { error: err.message });
    }
};

const createUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
        User.findOne({ email }),
        User.findOne({ username })
    ]);

    if (existingUserByEmail) {
        throw new ConflictError("User with this email already exists");
    }

    if (existingUserByUsername) {
        throw new ConflictError("User with this username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const userProfile = new UserProfile({
        user: newUser._id,
        full_name: null,
        bio: null,
        profile_picture_url: null
    });
    await userProfile.save();

    res.status(201).json({
        success: true,
        message: "User and user profile successfully created",
        timestamp: new Date().toISOString(),
        data: {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            created_at: newUser.created_at
        }
    });
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new NotFoundError("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new UnauthorizedError("Invalid credentials");
    }

    const accessToken = jwt.sign({ id: user._id }, privateKey, { algorithm: 'RS256', expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, privateKey, { algorithm: 'RS256', expiresIn: '7d' });

    const newRefreshToken = new RefreshToken({ token: refreshToken, user: user._id });
    await newRefreshToken.save();

    res.status(200).json({
        success: true,
        message: "Login successful",
        timestamp: new Date().toISOString(),
        data: { accessToken, refreshToken }
    });
});

const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: oldRefreshToken } = req.body;

    if (!oldRefreshToken) {
        throw new BadRequestError("Refresh token is required");
    }

    try {
        const decoded = verifyToken(oldRefreshToken);
        const user = await User.findById(decoded.id);

        if (!user) {
            throw new NotFoundError("User not found");
        }

        const newAccessToken = jwt.sign({ id: user._id }, privateKey, { algorithm: 'RS256', expiresIn: '15m' });
        const newRefreshToken = jwt.sign({ id: user._id }, privateKey, { algorithm: 'RS256', expiresIn: '7d' });

        // Remove old refresh token
        await RefreshToken.deleteOne({ token: oldRefreshToken });

        // Create new refresh token
        const refreshTokenDoc = new RefreshToken({ token: newRefreshToken, user: user._id });
        await refreshTokenDoc.save();

        res.status(200).json({
            success: true,
            message: "Token refreshed",
            timestamp: new Date().toISOString(),
            data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
        });
    } catch (error) {
        // This will catch the UnauthorizedError thrown by verifyToken
        if (error.statusCode === 401) {
            throw new UnauthorizedError("Invalid refresh token");
        }
        throw error; // Re-throw other errors
    }
});

const logoutUser = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        throw new BadRequestError("Refresh token missing or invalid");
    }

    await RefreshToken.deleteOne({ token: refreshToken });

    res.status(200).json({
        success: true,
        message: "Logout successful",
        timestamp: new Date().toISOString()
    });
});

module.exports = { loginUser, refreshToken, logoutUser, createUser };
