const request = require('supertest');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { User, Post, Like } = require('../models');
const { createTestUser, authHeader } = require('./helpers');

let mongoServer;
let testUser;
let otherUser;
let post;
let likeId;

beforeAll(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
  console.log(`MongoDB successfully connected to ${mongoUri}`);
});

beforeEach(async () => {
  // Clean up collections before creating new test data
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }

  // Create test users before each test
  testUser = await createTestUser({
    username: 'likeuser',
    email: 'likeuser@example.com'
  }, false); // Don't create profile automatically

  otherUser = await createTestUser({
    username: 'otherlikeuser',
    email: 'otherlikeuser@example.com'
  }, false); // Don't create profile automatically

  // Create a test post
  post = await Post.create({
    user: testUser.user._id,
    content: 'Test post for likes',
    visibility: 'public',
    created_at: new Date(),
    updated_at: new Date()
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('MongoDB disconnected and server stopped');
});

describe('Like Routes', () => {
  describe('POST /api/posts/:post_id/likes', () => {
    it('should create a like successfully', async () => {
      const response = await request(app)
        .post(`/api/posts/${post._id}/likes`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('liked');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('user', testUser.user._id.toString());
      expect(response.body.data).toHaveProperty('post', post._id.toString());

      // Save like ID for later tests
      likeId = response.body.data._id;

      // Verify like was created in the database
      const like = await Like.findById(likeId);
      expect(like).toBeTruthy();
      expect(like.user.toString()).toBe(testUser.user._id.toString());
      expect(like.post.toString()).toBe(post._id.toString());
    });

    it('should not allow duplicate likes from the same user', async () => {
      // Create a like first
      await request(app)
        .post(`/api/posts/${post._id}/likes`)
        .set(authHeader(testUser.token));

      // Try to like again
      const response = await request(app)
        .post(`/api/posts/${post._id}/likes`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already liked');
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/posts/${nonExistentId}/likes`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/posts/${post._id}/likes`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/posts/:post_id/likes', () => {
    beforeEach(async () => {
      // Create some test likes
      await Like.create([
        {
          post: post._id,
          user: testUser.user._id,
          created_at: new Date()
        },
        {
          post: post._id,
          user: otherUser.user._id,
          created_at: new Date()
        }
      ]);
    });

    it('should get all likes for a post', async () => {
      const response = await request(app)
        .get(`/api/posts/${post._id}/likes`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // All returned likes should belong to the post
      const allBelongToPost = response.body.data.every(like =>
        like.post === post._id.toString()
      );
      expect(allBelongToPost).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get(`/api/posts/${post._id}/likes`)
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('itemsPerPage', 1);
      expect(response.body.pagination).toHaveProperty('totalItems', 2);
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/posts/${nonExistentId}/likes`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('DELETE /api/posts/:post_id/likes', () => {
    beforeEach(async () => {
      // Create a test like
      await Like.create({
        post: post._id,
        user: testUser.user._id,
        created_at: new Date()
      });
    });

    it('should unlike a post successfully', async () => {
      const response = await request(app)
        .delete(`/api/posts/${post._id}/likes`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('unliked');

      // Verify like was deleted
      const like = await Like.findOne({ post: post._id, user: testUser.user._id });
      expect(like).toBeNull();
    });

    it('should return 404 if user has not liked the post', async () => {
      // Delete the like first
      await Like.deleteMany({ post: post._id, user: testUser.user._id });

      const response = await request(app)
        .delete(`/api/posts/${post._id}/likes`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/posts/${nonExistentId}/likes`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/posts/${post._id}/likes`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });
});
