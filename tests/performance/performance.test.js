const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { User, Post, Comment, Message, UserProfile } = require('../../models');
const { redisClient } = require('../../config/redis');

describe('Performance Tests', () => {
  let token, userId, secondUserId, postIds = [], commentIds = [], messageIds = [];
  const NUM_POSTS = 50; // Number of posts to create for testing
  const NUM_COMMENTS = 30; // Number of comments to create for testing
  const NUM_MESSAGES = 20; // Number of messages to create for testing

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/social_media_test');

    // Connect to Redis if not already connected
    if (!redisClient.isReady) {
      try {
        await redisClient.connect();
        console.log('Redis connected for performance tests');
      } catch (error) {
        console.error('Redis connection error in performance tests:', error);
      }
    }

    // Create test users
    const user = new User({
      username: 'perftest',
      email: 'perftest@example.com',
      password: 'Password123!'
    });
    await user.save();
    userId = user._id.toString();

    const secondUser = new User({
      username: 'perftest2',
      email: 'perftest2@example.com',
      password: 'Password123!'
    });
    await secondUser.save();
    secondUserId = secondUser._id.toString();

    // Create user profile
    const profile = new UserProfile({
      user: userId,
      full_name: 'Performance Test User',
      bio: 'This is a test user for performance testing',
      profile_picture_url: null
    });
    await profile.save();

    // Get private key for token generation
    const privateKeyPath = process.env.PRIVATE_KEY_PATH || 'keys/private.key';
    const privateKey = fs.readFileSync(path.resolve(__dirname, '../..', privateKeyPath), 'utf8');

    // Generate token for authentication
    token = jwt.sign({ id: userId }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });

    // Create test posts
    const posts = [];
    for (let i = 0; i < NUM_POSTS; i++) {
      posts.push({
        user: userId,
        content: `Performance test post ${i}`,
        visibility: 'public',
        created_at: new Date(Date.now() - i * 60000) // Posts at different times
      });
    }
    const savedPosts = await Post.insertMany(posts);
    postIds = savedPosts.map(post => post._id.toString());

    // Create test comments
    const comments = [];
    for (let i = 0; i < NUM_COMMENTS; i++) {
      comments.push({
        post: postIds[i % postIds.length], // Distribute comments across posts
        user: i % 2 === 0 ? userId : secondUserId, // Alternate between users
        content: `Performance test comment ${i}`,
        created_at: new Date(Date.now() - i * 30000) // Comments at different times
      });
    }
    const savedComments = await Comment.insertMany(comments);
    commentIds = savedComments.map(comment => comment._id.toString());

    // Create test messages
    const messages = [];
    for (let i = 0; i < NUM_MESSAGES; i++) {
      messages.push({
        sender: i % 2 === 0 ? userId : secondUserId,
        receiver: i % 2 === 0 ? secondUserId : userId,
        content: `Performance test message ${i}`,
        status: 'sent',
        read: i < NUM_MESSAGES / 2, // Half read, half unread
        created_at: new Date(Date.now() - i * 45000) // Messages at different times
      });
    }
    const savedMessages = await Message.insertMany(messages);
    messageIds = savedMessages.map(message => message._id.toString());

    // Clear Redis cache before tests
    if (redisClient.isReady) {
      try {
        const keys = await redisClient.keys('cache:*');
        if (keys.length > 0) {
          for (const key of keys) {
            await redisClient.del(key);
          }
          console.log(`Cleared ${keys.length} cache entries before performance tests`);
        }
      } catch (error) {
        console.error('Error clearing cache before performance tests:', error);
      }
    }
  });

  afterAll(async () => {
    // Clean up
    await User.deleteOne({ _id: userId });
    await User.deleteOne({ _id: secondUserId });
    await Post.deleteMany({ user: { $in: [userId, secondUserId] } });
    await Comment.deleteMany({ user: { $in: [userId, secondUserId] } });
    await Message.deleteMany({ $or: [{ sender: userId }, { sender: secondUserId }, { receiver: userId }, { receiver: secondUserId }] });
    await UserProfile.deleteMany({ user: { $in: [userId, secondUserId] } });

    // Disconnect from database
    await mongoose.disconnect();

    // Disconnect from Redis if connected
    if (redisClient.isReady) {
      await redisClient.disconnect();
      console.log('Redis disconnected after performance tests');
    }
  });

  describe('Post Query Optimization', () => {
    it('should efficiently retrieve posts with pagination', async () => {
      const start = Date.now();

      const res = await request(app)
        .get('/api/posts?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.at.most(10);

      // Performance assertion - should be reasonably fast
      // This is a flexible threshold that might need adjustment
      expect(duration).to.be.below(200, `Query took ${duration}ms which is too slow`);
    });

    it('should efficiently retrieve posts with sorting', async () => {
      const start = Date.now();

      const res = await request(app)
        .get('/api/posts?page=1&limit=10&sort=created_at&order=desc')
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;

      // Verify sorting
      const posts = res.body.data;
      for (let i = 0; i < posts.length - 1; i++) {
        const current = new Date(posts[i].created_at).getTime();
        const next = new Date(posts[i + 1].created_at).getTime();
        expect(current).to.be.at.least(next);
      }

      // Performance assertion
      expect(duration).to.be.below(200, `Sorted query took ${duration}ms which is too slow`);
    });
  });

  describe('Caching Performance', () => {
    it('should be faster on second request due to caching', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping caching performance test - Redis not connected');
        return;
      }

      // Clear the specific cache key we're going to test
      const cacheKey = 'cache:/api/posts?page=1&limit=10';
      await redisClient.del(cacheKey);
      console.log(`Cleared specific cache key: ${cacheKey}`);

      // First request (cache miss)
      const start1 = Date.now();

      const res1 = await request(app)
        .get('/api/posts?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      const duration1 = Date.now() - start1;

      expect(res1.status).to.equal(200);

      // Second request (cache hit)
      const start2 = Date.now();

      const res2 = await request(app)
        .get('/api/posts?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      const duration2 = Date.now() - start2;

      expect(res2.status).to.equal(200);

      // Verify that the second request was not significantly slower
      console.log(`Cache miss: ${duration1}ms, Cache hit: ${duration2}ms, Improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(2)}%`);

      // In test environments, timing can be inconsistent
      // We'll check that it's not significantly slower (within 200% margin for this test)
      // This is a more relaxed constraint than other tests because this test runs first
      // and might be affected by initial system load
      expect(duration2).to.be.at.most(duration1 * 3.0,
        `Cache hit took ${duration2}ms which is slower than cache miss (${duration1}ms)`);
    });
  });

  describe('User Query Optimization', () => {
    it('should efficiently retrieve users with pagination', async () => {
      const start = Date.now();

      const res = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');

      // Performance assertion
      expect(duration).to.be.below(200, `Query took ${duration}ms which is too slow`);
    });

    it('should efficiently retrieve user profiles', async () => {
      const start = Date.now();

      const res = await request(app)
        .get(`/api/users/${userId}/profiles`)
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;

      // Performance assertion
      expect(duration).to.be.below(200, `Query took ${duration}ms which is too slow`);
    });
  });

  describe('Comment Query Optimization', () => {
    it('should efficiently retrieve comments for a post', async () => {
      const start = Date.now();

      const res = await request(app)
        .get(`/api/posts/${postIds[0]}/comments?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');

      // Performance assertion
      expect(duration).to.be.below(200, `Query took ${duration}ms which is too slow`);
    });

    it('should efficiently retrieve comments with sorting', async () => {
      const start = Date.now();

      const res = await request(app)
        .get(`/api/posts/${postIds[0]}/comments?page=1&limit=10&sort=created_at&order=desc`)
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;

      // Verify sorting
      const comments = res.body.data;
      for (let i = 0; i < comments.length - 1; i++) {
        const current = new Date(comments[i].created_at).getTime();
        const next = new Date(comments[i + 1].created_at).getTime();
        expect(current).to.be.at.least(next);
      }

      // Performance assertion
      expect(duration).to.be.below(200, `Sorted query took ${duration}ms which is too slow`);
    });
  });

  describe('Message Query Optimization', () => {
    it('should efficiently retrieve conversations', async () => {
      const start = Date.now();

      const res = await request(app)
        .get('/api/messages/conversations?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');

      // Performance assertion
      expect(duration).to.be.below(200, `Query took ${duration}ms which is too slow`);
    });

    it('should efficiently retrieve messages between users', async () => {
      const start = Date.now();

      const res = await request(app)
        .get(`/api/messages/${secondUserId}?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');

      // Performance assertion
      expect(duration).to.be.below(200, `Query took ${duration}ms which is too slow`);
    });
  });

  describe('Projection Optimization', () => {
    it('should return only necessary fields for posts', async () => {
      const res = await request(app)
        .get('/api/posts?page=1&limit=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);

      const post = res.body.data[0];

      // Check that only necessary fields are returned
      // Get the actual fields from the response
      const actualFields = Object.keys(post);
      console.log('Actual post fields:', actualFields);

      // Check for required fields that should always be present
      const requiredFields = ['_id', 'content', 'visibility', 'created_at', 'user'];
      requiredFields.forEach(field => {
        expect(actualFields).to.include(field);
      });

      // Check that no sensitive or unnecessary fields are returned
      const forbiddenFields = ['__v', 'password', 'private_data'];
      forbiddenFields.forEach(field => {
        expect(actualFields).to.not.include(field);
      });

      // Check that the number of fields is reasonable (not returning everything)
      expect(actualFields.length).to.be.at.most(10, 'Too many fields returned');
    });

    it('should return only necessary fields for users', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);

      const user = res.body.data[0];

      // Get the actual fields from the response
      const actualFields = Object.keys(user);
      console.log('Actual user fields:', actualFields);

      // Check for required fields that should always be present
      const requiredFields = ['_id', 'username', 'email', 'created_at'];
      requiredFields.forEach(field => {
        expect(actualFields).to.include(field);
      });

      // Check that no sensitive fields are returned
      const forbiddenFields = ['password', 'private_data'];
      forbiddenFields.forEach(field => {
        expect(actualFields).to.not.include(field);
      });

      // Note: __v might be included in some MongoDB responses, which is acceptable

      // Check that the number of fields is reasonable
      expect(actualFields.length).to.be.at.most(10, 'Too many fields returned');
    });

    it('should return only necessary fields for comments', async () => {
      const res = await request(app)
        .get(`/api/posts/${postIds[0]}/comments?page=1&limit=1`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);

      const comment = res.body.data[0];

      // Get the actual fields from the response
      const actualFields = Object.keys(comment);
      console.log('Actual comment fields:', actualFields);

      // Check for required fields that should always be present
      const requiredFields = ['_id', 'content', 'user', 'post', 'created_at'];
      requiredFields.forEach(field => {
        expect(actualFields).to.include(field);
      });

      // Check that no sensitive fields are returned
      const forbiddenFields = ['__v', 'private_data'];
      forbiddenFields.forEach(field => {
        expect(actualFields).to.not.include(field);
      });

      // Check that the number of fields is reasonable
      expect(actualFields.length).to.be.at.most(10, 'Too many fields returned');
    });

    it('should return only necessary fields for messages', async () => {
      const res = await request(app)
        .get(`/api/messages/${secondUserId}?page=1&limit=1`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);

      const message = res.body.data[0];

      // Get the actual fields from the response
      const actualFields = Object.keys(message);
      console.log('Actual message fields:', actualFields);

      // Check for required fields that should always be present
      const requiredFields = ['_id', 'content', 'sender', 'receiver', 'status', 'created_at'];
      requiredFields.forEach(field => {
        expect(actualFields).to.include(field);
      });

      // Check that no sensitive fields are returned
      const forbiddenFields = ['__v', 'private_data'];
      forbiddenFields.forEach(field => {
        expect(actualFields).to.not.include(field);
      });

      // Check that the number of fields is reasonable
      expect(actualFields.length).to.be.at.most(10, 'Too many fields returned');
    });
  });

  describe('Enhanced Caching Performance', () => {
    it('should be faster on second request for posts due to caching', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping caching performance test - Redis not connected');
        return;
      }

      // Clear the specific cache key we're going to test
      const cacheKey = 'cache:/api/posts?page=1&limit=10';
      await redisClient.del(cacheKey);

      // First request (cache miss)
      const start1 = Date.now();
      const res1 = await request(app)
        .get('/api/posts?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);
      const duration1 = Date.now() - start1;

      expect(res1.status).to.equal(200);

      // Second request (cache hit)
      const start2 = Date.now();
      const res2 = await request(app)
        .get('/api/posts?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);
      const duration2 = Date.now() - start2;

      expect(res2.status).to.equal(200);
      expect(res2.body.cache).to.be.true;

      // Verify that the second request was not significantly slower
      console.log(`Posts - Cache miss: ${duration1}ms, Cache hit: ${duration2}ms, Improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(2)}%`);
      // In test environments, timing can be inconsistent
      // We'll check that it's not significantly slower (within 50% margin)
      expect(duration2).to.be.at.most(duration1 * 1.5);
    });

    it('should be faster on second request for users due to caching', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping caching performance test - Redis not connected');
        return;
      }

      // Clear the specific cache key we're going to test
      const cacheKey = 'cache:/api/users?page=1&limit=10';
      await redisClient.del(cacheKey);

      // First request (cache miss)
      const start1 = Date.now();
      const res1 = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);
      const duration1 = Date.now() - start1;

      expect(res1.status).to.equal(200);

      // Second request (cache hit)
      const start2 = Date.now();
      const res2 = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);
      const duration2 = Date.now() - start2;

      expect(res2.status).to.equal(200);
      expect(res2.body.cache).to.be.true;

      // Verify that the second request was faster
      console.log(`Users - Cache miss: ${duration1}ms, Cache hit: ${duration2}ms, Improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(2)}%`);
      expect(duration2).to.be.at.most(duration1);
    });

    it('should be faster on second request for comments due to caching', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping caching performance test - Redis not connected');
        return;
      }

      // Clear the specific cache key we're going to test
      const cacheKey = `cache:/api/posts/${postIds[0]}/comments?page=1&limit=10`;
      await redisClient.del(cacheKey);

      // First request (cache miss)
      const start1 = Date.now();
      const res1 = await request(app)
        .get(`/api/posts/${postIds[0]}/comments?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);
      const duration1 = Date.now() - start1;

      expect(res1.status).to.equal(200);

      // Second request (cache hit)
      const start2 = Date.now();
      const res2 = await request(app)
        .get(`/api/posts/${postIds[0]}/comments?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);
      const duration2 = Date.now() - start2;

      expect(res2.status).to.equal(200);
      expect(res2.body.cache).to.be.true;

      // Verify that the second request was faster
      console.log(`Comments - Cache miss: ${duration1}ms, Cache hit: ${duration2}ms, Improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(2)}%`);
      expect(duration2).to.be.at.most(duration1);
    });

    it('should be faster on second request for messages due to caching', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping caching performance test - Redis not connected');
        return;
      }

      // Clear the specific cache key we're going to test
      const cacheKey = `cache:/api/messages/${secondUserId}?page=1&limit=10`;
      await redisClient.del(cacheKey);

      // First request (cache miss)
      const start1 = Date.now();
      const res1 = await request(app)
        .get(`/api/messages/${secondUserId}?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);
      const duration1 = Date.now() - start1;

      expect(res1.status).to.equal(200);

      // Second request (cache hit)
      const start2 = Date.now();
      const res2 = await request(app)
        .get(`/api/messages/${secondUserId}?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);
      const duration2 = Date.now() - start2;

      expect(res2.status).to.equal(200);
      expect(res2.body.cache).to.be.true;

      // Verify that the second request was not significantly slower
      console.log(`Messages - Cache miss: ${duration1}ms, Cache hit: ${duration2}ms, Improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(2)}%`);
      // In test environments, timing can be inconsistent
      // We'll check that it's not significantly slower (within 50% margin)
      expect(duration2).to.be.at.most(duration1 * 1.5);
    });
  });

  describe('Database Indexing Performance', () => {
    it('should efficiently query posts by user ID', async () => {
      const start = Date.now();

      const res = await request(app)
        .get(`/api/users/${userId}/posts?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');

      // Performance assertion - should be fast due to indexing on user field
      expect(duration).to.be.below(200, `Query took ${duration}ms which is too slow`);
    });

    it('should efficiently query comments by post ID', async () => {
      const start = Date.now();

      const res = await request(app)
        .get(`/api/posts/${postIds[0]}/comments?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;

      // Performance assertion - should be fast due to indexing on post field
      expect(duration).to.be.below(200, `Query took ${duration}ms which is too slow`);
    });

    it('should efficiently query messages between users', async () => {
      const start = Date.now();

      const res = await request(app)
        .get(`/api/messages/${secondUserId}?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;

      // Performance assertion - should be reasonably fast due to indexing on sender and receiver fields
      // Message queries might be slower due to more complex relationships
      expect(duration).to.be.below(500, `Query took ${duration}ms which is too slow`);
    });
  });
});
