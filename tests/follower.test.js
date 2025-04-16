const request = require('supertest');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { User, Follower } = require('../models');
const { createTestUser, authHeader } = require('./helpers');

let mongoServer;
let testUser;
let otherUser;
let thirdUser;

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
    username: 'followeruser',
    email: 'followeruser@example.com'
  }, false); // Don't create profile automatically

  otherUser = await createTestUser({
    username: 'followeduser',
    email: 'followeduser@example.com'
  }, false); // Don't create profile automatically

  thirdUser = await createTestUser({
    username: 'thirduser',
    email: 'thirduser@example.com'
  }, false); // Don't create profile automatically
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('MongoDB disconnected and server stopped');
});

describe('Follower Routes', () => {
  describe('POST /api/users/:user_id/follow', () => {
    it('should follow a user successfully', async () => {
      const response = await request(app)
        .post(`/api/users/${otherUser.user._id}/follow`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('following');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('follower', testUser.user._id.toString());
      expect(response.body.data).toHaveProperty('following', otherUser.user._id.toString());

      // Verify follower relationship was created in the database
      const follower = await Follower.findOne({
        follower: testUser.user._id,
        following: otherUser.user._id
      });
      expect(follower).toBeTruthy();
    });

    it('should not allow following yourself', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.user._id}/follow`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot follow yourself');
    });

    it('should not allow duplicate follows', async () => {
      // Create a follow relationship first
      await request(app)
        .post(`/api/users/${otherUser.user._id}/follow`)
        .set(authHeader(testUser.token));

      // Try to follow again
      const response = await request(app)
        .post(`/api/users/${otherUser.user._id}/follow`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already following');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/users/${nonExistentId}/follow`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/users/${otherUser.user._id}/follow`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('DELETE /api/users/:user_id/follow', () => {
    beforeEach(async () => {
      // Create a follow relationship
      await Follower.create({
        follower: testUser.user._id,
        following: otherUser.user._id,
        created_at: new Date()
      });
    });

    it('should unfollow a user successfully', async () => {
      const response = await request(app)
        .delete(`/api/users/${otherUser.user._id}/follow`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('unfollowed');

      // Verify follower relationship was deleted
      const follower = await Follower.findOne({
        follower: testUser.user._id,
        following: otherUser.user._id
      });
      expect(follower).toBeNull();
    });

    it('should return 404 if not following the user', async () => {
      const response = await request(app)
        .delete(`/api/users/${thirdUser.user._id}/follow`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not following');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/users/${nonExistentId}/follow`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/users/${otherUser.user._id}/follow`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/users/:user_id/followers', () => {
    beforeEach(async () => {
      // Create some test followers
      await Follower.create([
        {
          follower: testUser.user._id,
          following: otherUser.user._id,
          created_at: new Date()
        },
        {
          follower: thirdUser.user._id,
          following: otherUser.user._id,
          created_at: new Date()
        }
      ]);
    });

    it('should get all followers for a user', async () => {
      const response = await request(app)
        .get(`/api/users/${otherUser.user._id}/followers`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // All returned followers should be following the specified user
      const allFollowingUser = response.body.data.every(follower =>
        follower.following === otherUser.user._id.toString()
      );
      expect(allFollowingUser).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get(`/api/users/${otherUser.user._id}/followers`)
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

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/users/${nonExistentId}/followers`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/users/:user_id/following', () => {
    beforeEach(async () => {
      // Create some test following relationships
      await Follower.create([
        {
          follower: testUser.user._id,
          following: otherUser.user._id,
          created_at: new Date()
        },
        {
          follower: testUser.user._id,
          following: thirdUser.user._id,
          created_at: new Date()
        }
      ]);
    });

    it('should get all users a user is following', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.user._id}/following`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // All returned following relationships should have the specified user as follower
      const allFollowedByUser = response.body.data.every(following =>
        following.follower === testUser.user._id.toString()
      );
      expect(allFollowedByUser).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.user._id}/following`)
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

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/users/${nonExistentId}/following`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
