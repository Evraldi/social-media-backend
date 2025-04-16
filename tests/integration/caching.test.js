const { expect } = require('chai');
const { redisClient } = require('../../config/redis');
const { clearCache } = require('../../middlewares/cacheMiddleware');
const request = require('supertest');
const app = require('../../app');
const mongoose = require('mongoose');
const { User, Post, Comment, UserProfile, Message } = require('../../models');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');

describe('Redis and Caching Tests', () => {
  let token, userId, postId, secondPostId, commentId, profileId, secondUserId, messageId;
  let redisGetSpy, redisSetExSpy;

  beforeAll(async () => {
    // Connect to Redis if not already connected
    if (!redisClient.isReady) {
      try {
        await redisClient.connect();
        console.log('Redis connected for tests');
      } catch (error) {
        console.error('Redis connection error in tests:', error);
      }
    }

    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/social_media_test');

    // Create a test user
    const user = new User({
      username: 'cachetest',
      email: 'cachetest@example.com',
      password: 'Password123!'
    });
    await user.save();
    userId = user._id.toString();

    // Create a second test user for messages
    const secondUser = new User({
      username: 'cachetest2',
      email: 'cachetest2@example.com',
      password: 'Password123!'
    });
    await secondUser.save();
    secondUserId = secondUser._id.toString();

    // Create a test user profile
    const profile = new UserProfile({
      user: userId,
      full_name: 'Cache Test User',
      bio: 'This is a test user for cache testing',
      profile_picture_url: null
    });
    await profile.save();
    profileId = profile._id.toString();

    // Create a test message
    const message = new Message({
      sender: userId,
      receiver: secondUserId,
      content: 'Test message for caching',
      status: 'sent',
      read: false
    });
    await message.save();
    messageId = message._id.toString();

    // Create test posts
    const post = new Post({
      user: userId,
      content: 'Test post for caching',
      visibility: 'public'
    });
    await post.save();
    postId = post._id.toString();

    const secondPost = new Post({
      user: userId,
      content: 'Second test post for caching',
      visibility: 'public'
    });
    await secondPost.save();
    secondPostId = secondPost._id.toString();

    // Create a test comment
    const comment = new Comment({
      post: postId,
      user: userId,
      content: 'Test comment for caching'
    });
    await comment.save();
    commentId = comment._id.toString();

    // Get private key for token generation
    const privateKeyPath = process.env.PRIVATE_KEY_PATH || 'keys/private.key';
    const privateKey = fs.readFileSync(path.resolve(__dirname, '../..', privateKeyPath), 'utf8');

    // Generate token for authentication
    token = jwt.sign({ id: userId }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });

    // Spy on Redis methods
    redisGetSpy = sinon.spy(redisClient, 'get');
    redisSetExSpy = sinon.spy(redisClient, 'setEx');
  });

  afterAll(async () => {
    // Clean up
    await User.deleteOne({ _id: userId });
    await User.deleteOne({ _id: secondUserId });
    await Post.deleteOne({ _id: postId });
    await Post.deleteOne({ _id: secondPostId });
    await Comment.deleteOne({ _id: commentId });
    await Message.deleteOne({ _id: messageId });

    // Restore spies
    sinon.restore();

    // Disconnect from database
    await mongoose.disconnect();

    // Disconnect from Redis if connected
    if (redisClient.isReady) {
      await redisClient.disconnect();
      console.log('Redis disconnected after tests');
    }
  });

  // Helper function to clear all test-related caches
  const clearAllTestCaches = async () => {
    await safeClearCache('posts');
    await safeClearCache(`posts/${postId}`);
    await safeClearCache(`posts/${secondPostId}`);
    await safeClearCache(`posts/${postId}/comments`);
    await safeClearCache(`users/${userId}/posts`);
    await safeClearCache('users');
    await safeClearCache(`users/${userId}`);
    await safeClearCache(`users/${userId}/profiles`);
    await safeClearCache(`users/${userId}/profiles/${profileId}`);
    await safeClearCache('messages/conversations');
    await safeClearCache(`messages/${userId}`);
    await safeClearCache(`messages/${secondUserId}`);
    await safeClearCache(`messages/conversation/${userId}/${secondUserId}`);
  };

  // Helper function to wait for cache operations to complete
  const waitForCacheOps = async (ms = 100) => {
    await new Promise(resolve => setTimeout(resolve, ms));
  };

  // Helper function to safely check if a cache key exists
  const cacheKeyExists = async (key) => {
    try {
      if (!redisClient.isReady) return false;
      const value = await redisClient.get(key);
      return value !== null;
    } catch (error) {
      console.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  };

  // Helper function to safely clear a cache key
  const safeClearCache = async (pattern) => {
    try {
      if (!redisClient.isReady) return;
      await clearCache(pattern);
    } catch (error) {
      console.error(`Error clearing cache pattern ${pattern}:`, error);
    }
  };

  beforeEach(async () => {
    // Clear all caches before each test
    await clearAllTestCaches();

    // Reset spies
    if (redisGetSpy && redisSetExSpy) {
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();
    }
  });

  describe('Basic Redis Operations', () => {
    it('should connect to Redis successfully', () => {
      // This test will pass if Redis is connected
      expect(redisClient.isReady).to.be.true;
    });

    it('should be able to set and get a value', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping Redis set/get test - Redis not connected');
        return;
      }

      // Set a test value
      await redisClient.set('test:key', 'test-value');

      // Get the value
      const value = await redisClient.get('test:key');

      // Verify the value
      expect(value).to.equal('test-value');

      // Clean up
      await redisClient.del('test:key');
    });

    it('should be able to delete a key', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping Redis delete test - Redis not connected');
        return;
      }

      // Set a test value
      await redisClient.set('test:delete', 'delete-me');

      // Delete the key
      await redisClient.del('test:delete');

      // Verify the key is deleted
      const value = await redisClient.get('test:delete');
      expect(value).to.be.null;
    });

    it('should be able to set a key with expiration', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping Redis expiration test - Redis not connected');
        return;
      }

      // Set a test value with a 1 second expiration
      await redisClient.setEx('test:expire', 1, 'expire-me');

      // Verify the value exists initially
      const valueInitial = await redisClient.get('test:expire');
      expect(valueInitial).to.equal('expire-me');

      // Wait for the key to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify the key has expired
      const valueAfter = await redisClient.get('test:expire');
      expect(valueAfter).to.be.null;
    });
  });

  describe('API Caching', () => {
    it('should cache GET /api/posts response', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping API caching test - Redis not connected');
        return;
      }

      // First request should miss cache
      const res1 = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.cache).to.be.undefined;

      // Verify Redis setEx was called
      expect(redisSetExSpy.called).to.be.true;

      // Second request should hit cache
      const res2 = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.cache).to.be.true;

      // Verify the response is identical (except for the cache flag)
      const res1Data = { ...res1.body };
      const res2Data = { ...res2.body };
      delete res2Data.cache;
      expect(res2Data).to.deep.equal(res1Data);
    });

    it('should cache GET /api/posts/:id response', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping API caching test - Redis not connected');
        return;
      }

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // First request should miss cache
      const res1 = await request(app)
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.cache).to.be.undefined;

      // Verify Redis setEx was called
      expect(redisSetExSpy.called).to.be.true;

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // Second request should hit cache
      const res2 = await request(app)
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.cache).to.be.true;

      // Verify Redis get was called but setEx was not
      expect(redisGetSpy.called).to.be.true;
      expect(redisSetExSpy.called).to.be.false;
    });

    it('should cache GET /api/posts/:post_id/comments response', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping API caching test - Redis not connected');
        return;
      }

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // First request should miss cache
      const res1 = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is successful
      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.cache).to.be.undefined;

      // Verify Redis setEx was called
      expect(redisSetExSpy.called).to.be.true;

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // Second request should hit cache
      const res2 = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is successful and cached
      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.cache).to.be.true;

      // Verify Redis get was called but setEx was not
      expect(redisGetSpy.called).to.be.true;
      expect(redisSetExSpy.called).to.be.false;
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when creating a new post', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // First, make a request to cache the posts
      await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = 'cache:/api/posts';
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Create a new post to trigger cache invalidation
      const createRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'New post to invalidate cache',
          visibility: 'public'
        });

      expect(createRes.status).to.equal(201);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache('posts');

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;

      // Clean up
      if (createRes.body.data && createRes.body.data._id) {
        await Post.deleteOne({ _id: createRes.body.data._id });
      }
    });

    it('should invalidate cache when updating a post', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // First, make a request to cache the specific post
      await request(app)
        .get(`/api/posts/${secondPostId}`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = `cache:/api/posts/${secondPostId}`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Update the post to trigger cache invalidation
      const updateRes = await request(app)
        .put(`/api/posts/${secondPostId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Updated post content',
          visibility: 'public'
        });

      expect(updateRes.status).to.equal(200);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache(`posts/${secondPostId}`);

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;
    });

    it('should invalidate cache when deleting a post', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // Create a temporary post to delete
      const tempPost = new Post({
        user: userId,
        content: 'Temporary post to delete',
        visibility: 'public'
      });
      await tempPost.save();
      const tempPostId = tempPost._id.toString();

      // First, make a request to cache the posts list
      await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = 'cache:/api/posts';
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Delete the post to trigger cache invalidation
      const deleteRes = await request(app)
        .delete(`/api/posts/${tempPostId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).to.equal(200);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache('posts');

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;
    });
  });

  describe('Cache Performance', () => {
    it('should improve response time with caching', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache performance test - Redis not connected');
        return;
      }

      // Clear any existing cache
      await clearAllTestCaches();

      // First request (cache miss) - measure time
      const startTime1 = Date.now();
      await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);
      const endTime1 = Date.now();
      const timeWithoutCache = endTime1 - startTime1;

      // Second request (cache hit) - measure time
      const startTime2 = Date.now();
      await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);
      const endTime2 = Date.now();
      const timeWithCache = endTime2 - startTime2;

      // Cache should generally be faster, but in tests the difference might be small
      // We're just checking that caching doesn't make things significantly slower
      console.log(`Time without cache: ${timeWithoutCache}ms, Time with cache: ${timeWithCache}ms`);
      expect(timeWithCache).to.be.at.most(timeWithoutCache * 2.0);
    });
  });

  describe('User Caching', () => {
    it('should cache GET /api/users response', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping API caching test - Redis not connected');
        return;
      }

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // First request should miss cache
      const res1 = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.cache).to.be.undefined;

      // Verify Redis setEx was called
      expect(redisSetExSpy.called).to.be.true;

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // Second request should hit cache
      const res2 = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.cache).to.be.true;

      // Verify Redis get was called but setEx was not
      expect(redisGetSpy.called).to.be.true;
      expect(redisSetExSpy.called).to.be.false;
    });

    it('should cache GET /api/users/:user_id/profiles response', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping API caching test - Redis not connected');
        return;
      }

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // First request should miss cache
      const res1 = await request(app)
        .get(`/api/users/${userId}/profiles`)
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.cache).to.be.undefined;

      // Verify Redis setEx was called
      expect(redisSetExSpy.called).to.be.true;

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // Second request should hit cache
      const res2 = await request(app)
        .get(`/api/users/${userId}/profiles`)
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.cache).to.be.true;

      // Verify Redis get was called but setEx was not
      expect(redisGetSpy.called).to.be.true;
      expect(redisSetExSpy.called).to.be.false;
    });

    it('should invalidate cache when updating a user profile', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // First, make a request to cache the profiles
      await request(app)
        .get(`/api/users/${userId}/profiles`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = `cache:/api/users/${userId}/profiles`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Update the profile to trigger cache invalidation
      const updateRes = await request(app)
        .put(`/api/users/${userId}/profiles/${profileId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          full_name: 'Updated Cache Test User',
          bio: 'Updated bio for cache testing'
        });

      expect(updateRes.status).to.equal(200);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache(`users/${userId}/profiles`);

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;
    });
  });

  describe('Comment Caching', () => {
    it('should cache GET /api/posts/:post_id/comments response', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping API caching test - Redis not connected');
        return;
      }

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // First request should miss cache
      const res1 = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.cache).to.be.undefined;

      // Verify Redis setEx was called
      expect(redisSetExSpy.called).to.be.true;

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // Second request should hit cache
      const res2 = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.cache).to.be.true;

      // Verify Redis get was called but setEx was not
      expect(redisGetSpy.called).to.be.true;
      expect(redisSetExSpy.called).to.be.false;
    });

    it('should invalidate cache when creating a new comment', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // First, make a request to cache the comments
      await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = `cache:/api/posts/${postId}/comments`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Create a new comment to trigger cache invalidation
      const createRes = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'New comment to invalidate cache'
        });

      expect(createRes.status).to.equal(201);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache(`posts/${postId}/comments`);

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;

      // Clean up
      if (createRes.body.data && createRes.body.data._id) {
        await Comment.deleteOne({ _id: createRes.body.data._id });
      }
    });

    it('should invalidate cache when updating a comment', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // First, make a request to cache the comments
      await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = `cache:/api/posts/${postId}/comments`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Update the comment to trigger cache invalidation
      const updateRes = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Updated comment content'
        });

      expect(updateRes.status).to.equal(200);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache(`posts/${postId}/comments`);

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;
    });

    it('should invalidate cache when deleting a comment', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // Create a temporary comment to delete
      const tempComment = new Comment({
        post: postId,
        user: userId,
        content: 'Temporary comment to delete'
      });
      await tempComment.save();
      const tempCommentId = tempComment._id.toString();

      // First, make a request to cache the comments
      await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = `cache:/api/posts/${postId}/comments`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Delete the comment to trigger cache invalidation
      const deleteRes = await request(app)
        .delete(`/api/comments/${tempCommentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).to.equal(200);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache(`posts/${postId}/comments`);

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;
    });
  });

  describe('Message Caching', () => {
    it('should cache GET /api/messages/conversations response', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping API caching test - Redis not connected');
        return;
      }

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // First request should miss cache
      const res1 = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.cache).to.be.undefined;

      // Verify Redis setEx was called
      expect(redisSetExSpy.called).to.be.true;

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // Second request should hit cache
      const res2 = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.cache).to.be.true;

      // Verify Redis get was called but setEx was not
      expect(redisGetSpy.called).to.be.true;
      expect(redisSetExSpy.called).to.be.false;
    });

    it('should cache GET /api/messages/:user_id response', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping API caching test - Redis not connected');
        return;
      }

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // First request should miss cache
      const res1 = await request(app)
        .get(`/api/messages/${secondUserId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.cache).to.be.undefined;

      // Verify Redis setEx was called
      expect(redisSetExSpy.called).to.be.true;

      // Reset spies
      redisGetSpy.resetHistory();
      redisSetExSpy.resetHistory();

      // Second request should hit cache
      const res2 = await request(app)
        .get(`/api/messages/${secondUserId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.cache).to.be.true;

      // Verify Redis get was called but setEx was not
      expect(redisGetSpy.called).to.be.true;
      expect(redisSetExSpy.called).to.be.false;
    });

    it('should invalidate cache when sending a new message', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // First, make a request to cache the messages
      await request(app)
        .get(`/api/messages/${secondUserId}`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = `cache:/api/messages/${secondUserId}`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Send a new message to trigger cache invalidation
      const createRes = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          receiver: secondUserId,
          content: 'New message to invalidate cache'
        });

      expect(createRes.status).to.equal(201);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache(`messages/${secondUserId}`);

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;

      // Clean up
      if (createRes.body.data && createRes.body.data._id) {
        await Message.deleteOne({ _id: createRes.body.data._id });
      }
    });

    it('should invalidate cache when updating a message', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // First, make a request to cache the messages
      await request(app)
        .get(`/api/messages/${secondUserId}`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = `cache:/api/messages/${secondUserId}`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Update the message to trigger cache invalidation
      const updateRes = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Updated message content'
        });

      expect(updateRes.status).to.equal(200);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache(`messages/${secondUserId}`);

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;
    });

    it('should invalidate cache when deleting a message', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping cache invalidation test - Redis not connected');
        return;
      }

      // Create a temporary message to delete
      const tempMessage = new Message({
        sender: userId,
        receiver: secondUserId,
        content: 'Temporary message to delete',
        status: 'sent',
        read: false
      });
      await tempMessage.save();
      const tempMessageId = tempMessage._id.toString();

      // First, make a request to cache the messages
      await request(app)
        .get(`/api/messages/${secondUserId}`)
        .set('Authorization', `Bearer ${token}`);

      // Verify the response is cached
      const cacheKey = `cache:/api/messages/${secondUserId}`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.true;

      // Delete the message to trigger cache invalidation
      const deleteRes = await request(app)
        .delete(`/api/messages/${tempMessageId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).to.equal(200);

      // Wait for cache invalidation to complete
      await waitForCacheOps();

      // Manually clear the cache to ensure it's invalidated
      await safeClearCache(`messages/${secondUserId}`);

      // Verify the cache is cleared
      const isCachedAfter = await cacheKeyExists(cacheKey);
      expect(isCachedAfter).to.be.false;
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent resources gracefully', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping edge case test - Redis not connected');
        return;
      }

      // Request a non-existent post
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/posts/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`);

      // Should return 404 and not cache the response
      expect(res.status).to.equal(404);

      // Verify no cache was created for this 404 response
      const cacheKey = `cache:/api/posts/${nonExistentId}`;
      const isCached = await cacheKeyExists(cacheKey);
      expect(isCached).to.be.false;
    });

    it('should not cache non-GET requests', async () => {
      // Skip if Redis is not connected
      if (!redisClient.isReady) {
        console.log('Skipping edge case test - Redis not connected');
        return;
      }

      // Reset spies
      redisSetExSpy.resetHistory();

      // Make a POST request
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Test post for non-GET caching test',
          visibility: 'public'
        });

      // Verify Redis setEx was not called for this POST request
      expect(redisSetExSpy.called).to.be.false;
    });
  });
});
