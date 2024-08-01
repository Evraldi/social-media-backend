const { User, RefreshToken } = require('../models');
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

const getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json({
            success: true,
            message: `Successfully retrieved ${users.length} user(s)`,
            data: users
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve users",
            error: error.message
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
                message: "User with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, email, password: hashedPassword });
        
        res.status(201).json({
            success: true,
            message: "User successfully created",
            data: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to create user",
            error: error.message
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
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const accessToken = jwt.sign({ id: user.id }, privateKey, { algorithm: 'RS256', expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id }, privateKey, { algorithm: 'RS256', expiresIn: '7d' });

        await RefreshToken.create({ token: refreshToken, userId: user.id });

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: { accessToken, refreshToken }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to log in",
            error: error.message
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

        await RefreshToken.destroy({ where: { token: oldRefreshToken } });
        await RefreshToken.create({ token: newRefreshToken, userId: user.id });

        res.status(200).json({
            success: true,
            message: "Token refreshed",
            data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(403).json({ success: false, message: "Invalid refresh token", error: error.message });
    }
};


const logoutUser = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        console.log('Refresh Token Received:', refreshToken);

        if (refreshToken) {
            await RefreshToken.destroy({ where: { token: refreshToken } });

            res.status(200).json({
                success: true,
                message: "Logout successful"
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Refresh token missing or invalid"
            });
        }
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({
            success: false,
            message: "Failed to logout",
            error: error.message
        });
    }
};





module.exports = { getUsers, createUser, loginUser, refreshToken, logoutUser };
