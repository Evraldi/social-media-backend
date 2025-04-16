const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { User, UserProfile } = require('../models');
const bcrypt = require('bcrypt');

// Read private key for JWT signing
const privateKeyPath = process.env.PRIVATE_KEY_PATH || 'keys/private.key';
const privateKey = fs.readFileSync(path.resolve(__dirname, '..', privateKeyPath), 'utf8');

/**
 * Create a test user and return user data with auth token
 * @param {Object} userData - User data to create
 * @returns {Promise<Object>} User data with auth token
 */
const createTestUser = async (userData = {}, createProfile = false) => {
  const defaultUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'user',
  };

  const userToCreate = { ...defaultUser, ...userData };
  const hashedPassword = await bcrypt.hash(userToCreate.password, 10);

  // Create user
  const user = new User({
    username: userToCreate.username,
    email: userToCreate.email,
    password: hashedPassword,
  });
  await user.save();

  let userProfile = null;

  // Create user profile if requested
  if (createProfile) {
    userProfile = new UserProfile({
      user: user._id,
      full_name: userToCreate.full_name || null,
      bio: userToCreate.bio || null,
      profile_picture_url: userToCreate.profile_picture_url || null,
    });
    await userProfile.save();
  }

  // Generate token
  const token = jwt.sign({ id: user._id }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });

  return {
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
    },
    profile: userProfile,
    token,
    rawPassword: userToCreate.password,
  };
};

/**
 * Generate auth header with token
 * @param {string} token - JWT token
 * @returns {Object} Auth header object
 */
const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Make an authenticated request
 * @param {Object} app - Express app
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {string} token - JWT token
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response
 */
const authenticatedRequest = async (app, request, method, url, token, data = null) => {
  const req = request(app)[method.toLowerCase()](url)
    .set('Authorization', `Bearer ${token}`);

  if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
    return await req.send(data);
  }

  return await req;
};

module.exports = {
  createTestUser,
  authHeader,
  authenticatedRequest,
};
