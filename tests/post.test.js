const request = require('supertest');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { User, Post } = require('../models');
const { createTestUser, authHeader } = require('./helpers');
const path = require('path');
const fs = require('fs');

let mongoServer;
let testUser;
let otherUser;
let postId;

beforeAll(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
  console.log(`MongoDB successfully connected to ${mongoUri}`);

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'posts');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
});

beforeEach(async () => {
  // Clean up collections before creating new test data
  await User.deleteMany({});
  await Post.deleteMany({});

  // Create test users before each test
  testUser = await createTestUser({
    username: 'postuser',
    email: 'postuser@example.com'
  }, false); // Don't create profile automatically

  otherUser = await createTestUser({
    username: 'otheruser',
    email: 'otheruser@example.com'
  }, false); // Don't create profile automatically
});

afterEach(async () => {
  // Clean up collections after each test
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('MongoDB disconnected and server stopped');
});

describe('Post Routes', () => {
  describe('POST /api/posts', () => {
    it('should create a post successfully', async () => {
      const postData = {
        content: 'This is a test post',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/posts')
        .set(authHeader(testUser.token))
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('content', postData.content);
      expect(response.body.data).toHaveProperty('visibility', postData.visibility);
      expect(response.body.data).toHaveProperty('user', testUser.user._id.toString());

      // Save post ID for later tests
      postId = response.body.data._id;

      // Verify post was created in the database
      const post = await Post.findById(postId);
      expect(post).toBeTruthy();
      expect(post.content).toBe(postData.content);
    });

    it('should validate post data', async () => {
      const invalidData = {
        // Invalid visibility value
        visibility: 'invalid_value'
      };

      const response = await request(app)
        .post('/api/posts')
        .set(authHeader(testUser.token))
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const postData = {
        content: 'This is a test post',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/posts', () => {
    beforeEach(async () => {
      // Create some test posts
      await Post.create([
        {
          user: testUser.user._id,
          content: 'Public post 1',
          visibility: 'public',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          user: testUser.user._id,
          content: 'Public post 2',
          visibility: 'public',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          user: testUser.user._id,
          content: 'Private post',
          visibility: 'private',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          user: otherUser.user._id,
          content: 'Other user public post',
          visibility: 'public',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should get all public posts', async () => {
      const response = await request(app)
        .get('/api/posts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3); // Only public posts

      // All returned posts should be public
      const allPublic = response.body.data.every(post => post.visibility === 'public');
      expect(allPublic).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get('/api/posts')
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('itemsPerPage', 2);
      expect(response.body.pagination).toHaveProperty('totalItems', 3); // 3 public posts
    });
  });

  describe('GET /api/posts/:id', () => {
    beforeEach(async () => {
      // Create a test post
      const post = await Post.create({
        user: testUser.user._id,
        content: 'Test post for retrieval',
        visibility: 'public',
        created_at: new Date(),
        updated_at: new Date()
      });

      postId = post._id;
    });

    it('should get a post by ID', async () => {
      const response = await request(app)
        .get(`/api/posts/${postId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', postId.toString());
      expect(response.body.data).toHaveProperty('content', 'Test post for retrieval');
      expect(response.body.data.user).toHaveProperty('_id', testUser.user._id.toString());
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/posts/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should not return private posts to unauthorized users', async () => {
      // Create a private post
      const privatePost = await Post.create({
        user: testUser.user._id,
        content: 'Private post',
        visibility: 'private',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Try to access without authentication
      const response = await request(app)
        .get(`/api/posts/${privatePost._id}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return private posts to the owner', async () => {
      // Create a private post directly in the database
      const privatePost = new Post({
        user: testUser.user._id,
        content: 'Private post',
        visibility: 'private',
        created_at: new Date(),
        updated_at: new Date()
      });
      await privatePost.save();

      // Access with authentication
      const response = await request(app)
        .get(`/api/posts/${privatePost._id}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', privatePost._id.toString());
      expect(response.body.data).toHaveProperty('visibility', 'private');
    });
  });

  describe('PUT /api/posts/:id', () => {
    beforeEach(async () => {
      // Create a test post
      const post = await Post.create({
        user: testUser.user._id,
        content: 'Original content',
        visibility: 'public',
        created_at: new Date(),
        updated_at: new Date()
      });

      postId = post._id;
    });

    it('should update a post successfully', async () => {
      const updateData = {
        content: 'Updated content',
        visibility: 'friends'
      };

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set(authHeader(testUser.token))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
      expect(response.body.data).toHaveProperty('_id', postId.toString());
      expect(response.body.data).toHaveProperty('content', updateData.content);
      expect(response.body.data).toHaveProperty('visibility', updateData.visibility);

      // Verify post was updated in the database
      const updatedPost = await Post.findById(postId);
      expect(updatedPost.content).toBe(updateData.content);
      expect(updatedPost.visibility).toBe(updateData.visibility);
    });

    it('should not allow updating another user\'s post', async () => {
      const updateData = {
        content: 'Unauthorized update',
        visibility: 'public'
      };

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set(authHeader(otherUser.token))
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Forbidden');

      // Verify post was not updated
      const post = await Post.findById(postId);
      expect(post.content).toBe('Original content');
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = {
        content: 'Updated content',
        visibility: 'public'
      };

      const response = await request(app)
        .put(`/api/posts/${nonExistentId}`)
        .set(authHeader(testUser.token))
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const updateData = {
        content: 'Updated content',
        visibility: 'public'
      };

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    beforeEach(async () => {
      // Create a test post
      const post = await Post.create({
        user: testUser.user._id,
        content: 'Post to be deleted',
        visibility: 'public',
        created_at: new Date(),
        updated_at: new Date()
      });

      postId = post._id;
    });

    it('should delete a post successfully', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify post was deleted
      const deletedPost = await Post.findById(postId);
      expect(deletedPost).toBeNull();
    });

    it('should not allow deleting another user\'s post', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set(authHeader(otherUser.token));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Forbidden');

      // Verify post was not deleted
      const post = await Post.findById(postId);
      expect(post).not.toBeNull();
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/posts/${nonExistentId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/users/:user_id/posts', () => {
    beforeEach(async () => {
      // Create some test posts
      await Post.create([
        {
          user: testUser.user._id,
          content: 'Public post 1',
          visibility: 'public',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          user: testUser.user._id,
          content: 'Public post 2',
          visibility: 'public',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          user: testUser.user._id,
          content: 'Private post',
          visibility: 'private',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should get all public posts for a user', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.user._id}/posts`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // Only public posts

      // All returned posts should be public
      const allPublic = response.body.data.every(post => post.visibility === 'public');
      expect(allPublic).toBe(true);

      // All returned posts should belong to the user
      const allBelongToUser = response.body.data.every(post =>
        post.user._id === testUser.user._id.toString()
      );
      expect(allBelongToUser).toBe(true);
    });

    it('should include private posts when authenticated as the user', async () => {
      // Create a new private post for the test user
      const privatePost = await Post.create({
        user: testUser.user._id,
        content: 'Private post for auth test',
        visibility: 'private',
        created_at: new Date(),
        updated_at: new Date()
      });

      const response = await request(app)
        .get(`/api/users/${testUser.user._id}/posts`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include the private post we just created
      const hasPrivatePost = response.body.data.some(post =>
        post._id === privatePost._id.toString() && post.visibility === 'private'
      );
      expect(hasPrivatePost).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.user._id}/posts`)
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('itemsPerPage', 1);
      expect(response.body.pagination).toHaveProperty('totalItems', 2); // 2 public posts
    });
  });
});
