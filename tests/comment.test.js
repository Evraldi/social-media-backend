const request = require('supertest');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { User, Post, Comment } = require('../models');
const { createTestUser, authHeader } = require('./helpers');

let mongoServer;
let testUser;
let otherUser;
let post;
let commentId;

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
    username: 'commentuser',
    email: 'commentuser@example.com'
  }, false); // Don't create profile automatically

  otherUser = await createTestUser({
    username: 'othercommentuser',
    email: 'othercommentuser@example.com'
  }, false); // Don't create profile automatically

  // Create a test post
  post = await Post.create({
    user: testUser.user._id,
    content: 'Test post for comments',
    visibility: 'public',
    created_at: new Date(),
    updated_at: new Date()
  });
});

// No need for afterEach cleanup since we're doing it in beforeEach

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('MongoDB disconnected and server stopped');
});

describe('Comment Routes', () => {
  describe('POST /api/posts/:post_id/comments', () => {
    it('should create a comment successfully', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set(authHeader(testUser.token))
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('content', commentData.content);
      expect(response.body.data).toHaveProperty('user', testUser.user._id.toString());
      expect(response.body.data).toHaveProperty('post', post._id.toString());

      // Save comment ID for later tests
      commentId = response.body.data._id;

      // Verify comment was created in the database
      const comment = await Comment.findById(commentId);
      expect(comment).toBeTruthy();
      expect(comment.content).toBe(commentData.content);
    });

    it('should validate comment data', async () => {
      const invalidData = {
        // Missing content
      };

      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set(authHeader(testUser.token))
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const commentData = {
        content: 'Comment on non-existent post'
      };

      const response = await request(app)
        .post(`/api/posts/${nonExistentId}/comments`)
        .set(authHeader(testUser.token))
        .send(commentData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .send(commentData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/posts/:post_id/comments', () => {
    beforeEach(async () => {
      // Create some test comments
      await Comment.create([
        {
          post: post._id,
          user: testUser.user._id,
          content: 'Comment 1',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          post: post._id,
          user: otherUser.user._id,
          content: 'Comment 2',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          post: post._id,
          user: testUser.user._id,
          content: 'Comment 3',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should get all comments for a post', async () => {
      const response = await request(app)
        .get(`/api/posts/${post._id}/comments`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);

      // All returned comments should belong to the post
      const allBelongToPost = response.body.data.every(comment =>
        comment.post === post._id.toString()
      );
      expect(allBelongToPost).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get(`/api/posts/${post._id}/comments`)
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('itemsPerPage', 2);
      expect(response.body.pagination).toHaveProperty('totalItems', 3);
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/posts/${nonExistentId}/comments`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/comments/:id', () => {
    beforeEach(async () => {
      // Create a test comment
      const comment = await Comment.create({
        post: post._id,
        user: testUser.user._id,
        content: 'Original comment',
        created_at: new Date(),
        updated_at: new Date()
      });

      commentId = comment._id;
    });

    it('should update a comment successfully', async () => {
      const updateData = {
        content: 'Updated comment'
      };

      const response = await request(app)
        .put(`/api/comments/${commentId}`)
        .set(authHeader(testUser.token))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
      expect(response.body.data).toHaveProperty('_id', commentId.toString());
      expect(response.body.data).toHaveProperty('content', updateData.content);

      // Verify comment was updated in the database
      const updatedComment = await Comment.findById(commentId);
      expect(updatedComment.content).toBe(updateData.content);
    });

    it('should not allow updating another user\'s comment', async () => {
      const updateData = {
        content: 'Unauthorized update'
      };

      const response = await request(app)
        .put(`/api/comments/${commentId}`)
        .set(authHeader(otherUser.token))
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Forbidden');

      // Verify comment was not updated
      const comment = await Comment.findById(commentId);
      expect(comment.content).toBe('Original comment');
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = {
        content: 'Updated comment'
      };

      const response = await request(app)
        .put(`/api/comments/${nonExistentId}`)
        .set(authHeader(testUser.token))
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const updateData = {
        content: 'Updated comment'
      };

      const response = await request(app)
        .put(`/api/comments/${commentId}`)
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('DELETE /api/comments/:id', () => {
    beforeEach(async () => {
      // Create a test comment
      const comment = await Comment.create({
        post: post._id,
        user: testUser.user._id,
        content: 'Comment to be deleted',
        created_at: new Date(),
        updated_at: new Date()
      });

      commentId = comment._id;
    });

    it('should delete a comment successfully', async () => {
      const response = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify comment was deleted
      const deletedComment = await Comment.findById(commentId);
      expect(deletedComment).toBeNull();
    });

    it('should not allow deleting another user\'s comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set(authHeader(otherUser.token));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Forbidden');

      // Verify comment was not deleted
      const comment = await Comment.findById(commentId);
      expect(comment).not.toBeNull();
    });

    it('should allow post owner to delete any comment on their post', async () => {
      // Create a comment by otherUser on testUser's post
      const otherUserComment = await Comment.create({
        post: post._id,
        user: otherUser.user._id,
        content: 'Comment by other user',
        created_at: new Date(),
        updated_at: new Date()
      });

      // testUser (post owner) tries to delete otherUser's comment
      const response = await request(app)
        .delete(`/api/comments/${otherUserComment._id}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify comment was deleted
      const deletedComment = await Comment.findById(otherUserComment._id);
      expect(deletedComment).toBeNull();
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/comments/${nonExistentId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/comments/${commentId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });
});
