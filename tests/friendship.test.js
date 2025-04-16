const request = require('supertest');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { User, Friendship } = require('../models');
const { createTestUser, authHeader } = require('./helpers');

let mongoServer;
let testUser;
let otherUser;
let thirdUser;
let friendshipId;

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
    username: 'frienduser',
    email: 'frienduser@example.com'
  }, false); // Don't create profile automatically

  otherUser = await createTestUser({
    username: 'friendrequestuser',
    email: 'friendrequestuser@example.com'
  }, false); // Don't create profile automatically

  thirdUser = await createTestUser({
    username: 'thirdfrienduser',
    email: 'thirdfrienduser@example.com'
  }, false); // Don't create profile automatically
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('MongoDB disconnected and server stopped');
});

describe('Friendship Routes', () => {
  describe('POST /api/users/:user_id/friend-requests', () => {
    it('should send a friend request successfully', async () => {
      const response = await request(app)
        .post(`/api/users/${otherUser.user._id}/friend-requests`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('friend request sent');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('requester', testUser.user._id.toString());
      expect(response.body.data).toHaveProperty('receiver', otherUser.user._id.toString());
      expect(response.body.data).toHaveProperty('status', 'pending');

      // Save friendship ID for later tests
      friendshipId = response.body.data._id;

      // Verify friendship was created in the database
      const friendship = await Friendship.findById(friendshipId);
      expect(friendship).toBeTruthy();
      expect(friendship.requester.toString()).toBe(testUser.user._id.toString());
      expect(friendship.receiver.toString()).toBe(otherUser.user._id.toString());
      expect(friendship.status).toBe('pending');
    });

    it('should not allow sending a friend request to yourself', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.user._id}/friend-requests`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot send friend request to yourself');
    });

    it('should not allow duplicate friend requests', async () => {
      // Create a friend request first
      await request(app)
        .post(`/api/users/${otherUser.user._id}/friend-requests`)
        .set(authHeader(testUser.token));

      // Try to send another request
      const response = await request(app)
        .post(`/api/users/${otherUser.user._id}/friend-requests`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/users/${nonExistentId}/friend-requests`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/users/${otherUser.user._id}/friend-requests`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/friend-requests', () => {
    beforeEach(async () => {
      // Create some test friend requests
      await Friendship.create([
        {
          requester: otherUser.user._id,
          receiver: testUser.user._id,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          requester: thirdUser.user._id,
          receiver: testUser.user._id,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should get all pending friend requests for the user', async () => {
      const response = await request(app)
        .get('/api/friend-requests')
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // All returned requests should be for the authenticated user
      const allForUser = response.body.data.every(request =>
        request.receiver === testUser.user._id.toString() &&
        request.status === 'pending'
      );
      expect(allForUser).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/friend-requests');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('PUT /api/friend-requests/:id/accept', () => {
    beforeEach(async () => {
      // Create a pending friend request
      const friendship = await Friendship.create({
        requester: otherUser.user._id,
        receiver: testUser.user._id,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });

      friendshipId = friendship._id;
    });

    it('should accept a friend request successfully', async () => {
      const response = await request(app)
        .put(`/api/friend-requests/${friendshipId}/accept`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('accepted');
      expect(response.body.data).toHaveProperty('status', 'accepted');

      // Verify friendship was updated in the database
      const friendship = await Friendship.findById(friendshipId);
      expect(friendship.status).toBe('accepted');
    });

    it('should not allow accepting a request not sent to the user', async () => {
      // Create a request between other users
      const otherFriendship = await Friendship.create({
        requester: otherUser.user._id,
        receiver: thirdUser.user._id,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });

      const response = await request(app)
        .put(`/api/friend-requests/${otherFriendship._id}/accept`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should return 404 for non-existent friend request', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/friend-requests/${nonExistentId}/accept`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/friend-requests/${friendshipId}/accept`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('PUT /api/friend-requests/:id/reject', () => {
    beforeEach(async () => {
      // Create a pending friend request
      const friendship = await Friendship.create({
        requester: otherUser.user._id,
        receiver: testUser.user._id,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });

      friendshipId = friendship._id;
    });

    it('should reject a friend request successfully', async () => {
      const response = await request(app)
        .put(`/api/friend-requests/${friendshipId}/reject`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected');
      expect(response.body.data).toHaveProperty('status', 'rejected');

      // Verify friendship was updated in the database
      const friendship = await Friendship.findById(friendshipId);
      expect(friendship.status).toBe('rejected');
    });

    it('should not allow rejecting a request not sent to the user', async () => {
      // Create a request between other users
      const otherFriendship = await Friendship.create({
        requester: otherUser.user._id,
        receiver: thirdUser.user._id,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });

      const response = await request(app)
        .put(`/api/friend-requests/${otherFriendship._id}/reject`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should return 404 for non-existent friend request', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/friend-requests/${nonExistentId}/reject`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/friend-requests/${friendshipId}/reject`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/users/:user_id/friends', () => {
    beforeEach(async () => {
      // Create some accepted friendships
      await Friendship.create([
        {
          requester: testUser.user._id,
          receiver: otherUser.user._id,
          status: 'accepted',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          requester: thirdUser.user._id,
          receiver: testUser.user._id,
          status: 'accepted',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should get all friends for a user', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.user._id}/friends`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // All returned friendships should involve the specified user and be accepted
      const allInvolvingUser = response.body.data.every(friendship =>
        (friendship.requester._id.toString() === testUser.user._id.toString() ||
         friendship.receiver._id.toString() === testUser.user._id.toString()) &&
        friendship.status === 'accepted'
      );
      expect(allInvolvingUser).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.user._id}/friends`)
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
        .get(`/api/users/${nonExistentId}/friends`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('DELETE /api/friendships/:id', () => {
    beforeEach(async () => {
      // Create an accepted friendship
      const friendship = await Friendship.create({
        requester: testUser.user._id,
        receiver: otherUser.user._id,
        status: 'accepted',
        created_at: new Date(),
        updated_at: new Date()
      });

      friendshipId = friendship._id;
    });

    it('should remove a friendship successfully', async () => {
      const response = await request(app)
        .delete(`/api/friendships/${friendshipId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed');

      // Verify friendship was deleted
      const friendship = await Friendship.findById(friendshipId);
      expect(friendship).toBeNull();
    });

    it('should not allow removing a friendship the user is not part of', async () => {
      // Create a friendship between other users
      const otherFriendship = await Friendship.create({
        requester: otherUser.user._id,
        receiver: thirdUser.user._id,
        status: 'accepted',
        created_at: new Date(),
        updated_at: new Date()
      });

      const response = await request(app)
        .delete(`/api/friendships/${otherFriendship._id}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should return 404 for non-existent friendship', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/friendships/${nonExistentId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/friendships/${friendshipId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });
});
