const { User, UserProfile, RefreshToken } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
        throw new Error('Invalid token');
    }
};

const createUser = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const [existingUserByEmail, existingUserByUsername] = await Promise.all([
            User.findOne({ where: { email } }),
            User.findOne({ where: { username } })
        ]);

        if (existingUserByEmail) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists",
                timestamp: new Date().toISOString()
            });
        }

        if (existingUserByUsername) {
            return res.status(409).json({
                success: false,
                message: "User with this username already exists",
                timestamp: new Date().toISOString()
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, email, password: hashedPassword });

        await UserProfile.create({
            user_id: newUser.id,
            full_name: null,
            bio: null,
            profile_picture_url: null
        });

        res.status(201).json({
            success: true,
            message: "User and user profile successfully created",
            timestamp: new Date().toISOString(),
            data: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                created_at: newUser.created_at
            }
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

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                timestamp: new Date().toISOString()
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
                timestamp: new Date().toISOString()
            });
        }

        const accessToken = jwt.sign({ id: user.id }, privateKey, { algorithm: 'RS256', expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id }, privateKey, { algorithm: 'RS256', expiresIn: '7d' });

        await RefreshToken.create({ token: refreshToken, userId: user.id });

        res.status(200).json({
            success: true,
            message: "Login successful",
            timestamp: new Date().toISOString(),
            data: { accessToken, refreshToken }
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

const refreshToken = async (req, res) => {
    const { refreshToken: oldRefreshToken } = req.body;
    try {
        const decoded = verifyToken(oldRefreshToken);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const newAccessToken = jwt.sign({ id: user.id }, privateKey, { algorithm: 'RS256', expiresIn: '15m' });
        const newRefreshToken = jwt.sign({ id: user.id }, privateKey, { algorithm: 'RS256', expiresIn: '7d' });

        await Promise.all([
            RefreshToken.destroy({ where: { token: oldRefreshToken } }),
            RefreshToken.create({ token: newRefreshToken, userId: user.id })
        ]);

        res.status(200).json({
            success: true,
            message: "Token refreshed",
            timestamp: new Date().toISOString(),
            data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
        });
    } catch (error) {
        console.error(error);
        res.status(403).json({
             success: false,
             message: "Invalid refresh token",
             timestamp: new Date().toISOString()
        });
    }
};

const logoutUser = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await RefreshToken.destroy({ where: { token: refreshToken } });

            res.status(200).json({
                success: true,
                message: "Logout successful",
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Refresh token missing or invalid",
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

module.exports = { loginUser, refreshToken, logoutUser, createUser };
