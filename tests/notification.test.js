const request = require('supertest');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Notification } = require('../models');
const { createTestUser, authHeader } = require('./helpers');

let mongoServer;
let testUser;
let otherUser;
let notificationId;

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
    username: 'notificationuser',
    email: 'notificationuser@example.com'
  }, false); // Don't create profile automatically

  otherUser = await createTestUser({
    username: 'othernotificationuser',
    email: 'othernotificationuser@example.com'
  }, false); // Don't create profile automatically
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('MongoDB disconnected and server stopped');
});

describe('Notification Routes', () => {
  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      // Create some test notifications
      await Notification.create([
        {
          user: testUser.user._id,
          sender: otherUser.user._id,
          type: 'follow',
          content: 'started following you',
          read: false,
          created_at: new Date(Date.now() - 1000)
        },
        {
          user: testUser.user._id,
          sender: otherUser.user._id,
          type: 'like',
          content: 'liked your post',
          read: true,
          created_at: new Date()
        }
      ]);
    });

    it('should get all notifications for the authenticated user', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // All returned notifications should belong to the user
      const allBelongToUser = response.body.data.every(notification =>
        notification.user === testUser.user._id.toString()
      );
      expect(allBelongToUser).toBe(true);

      // Notifications should be in reverse chronological order (newest first)
      expect(response.body.data[0].type).toBe('like');
      expect(response.body.data[1].type).toBe('follow');
    });

    it('should filter by read status', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .query({ read: false })
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].type).toBe('follow');
      expect(response.body.data[0].read).toBe(false);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .query({ page: 1, limit: 1 })
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('itemsPerPage', 1);
      expect(response.body.pagination).toHaveProperty('totalItems', 2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/notifications/unread/count', () => {
    beforeEach(async () => {
      // Create some test notifications
      await Notification.create([
        {
          user: testUser.user._id,
          sender: otherUser.user._id,
          type: 'follow',
          content: 'started following you',
          read: false,
          created_at: new Date()
        },
        {
          user: testUser.user._id,
          sender: otherUser.user._id,
          type: 'like',
          content: 'liked your post',
          read: false,
          created_at: new Date()
        },
        {
          user: testUser.user._id,
          sender: otherUser.user._id,
          type: 'comment',
          content: 'commented on your post',
          read: true,
          created_at: new Date()
        }
      ]);
    });

    it('should get unread notification count', async () => {
      const response = await request(app)
        .get('/api/notifications/unread/count')
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count', 2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/unread/count');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    beforeEach(async () => {
      // Create a test notification
      const notification = new Notification({
        user: testUser.user._id,
        sender: otherUser.user._id,
        type: 'follow',
        content: 'started following you',
        read: false,
        created_at: new Date()
      });
      await notification.save();
      notificationId = notification._id;
    });

    it('should mark a notification as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('marked as read');
      expect(response.body.data).toHaveProperty('read', true);

      // Verify notification was updated in the database
      const notification = await Notification.findById(notificationId);
      expect(notification.read).toBe(true);
    });

    it('should not allow marking another user\'s notification', async () => {
      // Create a notification for other user
      const otherNotification = new Notification({
        user: otherUser.user._id,
        sender: testUser.user._id,
        type: 'follow',
        content: 'started following you',
        read: false,
        created_at: new Date()
      });
      await otherNotification.save();

      const response = await request(app)
        .put(`/api/notifications/${otherNotification._id}/read`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');

      // Verify notification was not updated
      const notification = await Notification.findById(otherNotification._id);
      expect(notification.read).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/notifications/${nonExistentId}/read`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('PUT /api/notifications/read/all', () => {
    beforeEach(async () => {
      // Create some test notifications
      await Notification.create([
        {
          user: testUser.user._id,
          sender: otherUser.user._id,
          type: 'follow',
          content: 'started following you',
          read: false,
          created_at: new Date()
        },
        {
          user: testUser.user._id,
          sender: otherUser.user._id,
          type: 'like',
          content: 'liked your post',
          read: false,
          created_at: new Date()
        }
      ]);
    });

    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .put('/api/notifications/read/all')
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('marked as read');

      // Verify all notifications were updated
      const notifications = await Notification.find({ user: testUser.user._id });
      const allRead = notifications.every(notification => notification.read === true);
      expect(allRead).toBe(true);
    });

    it('should only mark the authenticated user\'s notifications', async () => {
      // Create notifications for other user
      await Notification.create([
        {
          user: otherUser.user._id,
          sender: testUser.user._id,
          type: 'follow',
          content: 'started following you',
          read: false,
          created_at: new Date()
        }
      ]);

      await request(app)
        .put('/api/notifications/read/all')
        .set(authHeader(testUser.token));

      // Verify other user's notifications were not updated
      const otherUserNotifications = await Notification.find({ user: otherUser.user._id });
      const allOtherUserNotificationsUnread = otherUserNotifications.every(notification => notification.read === false);
      expect(allOtherUserNotificationsUnread).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/notifications/read/all');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    beforeEach(async () => {
      // Create a test notification
      const notification = new Notification({
        user: testUser.user._id,
        sender: otherUser.user._id,
        type: 'follow',
        content: 'started following you',
        read: false,
        created_at: new Date()
      });
      await notification.save();
      notificationId = notification._id;
    });

    it('should delete a notification successfully', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify notification was deleted
      const notification = await Notification.findById(notificationId);
      expect(notification).toBeNull();
    });

    it('should not allow deleting another user\'s notification', async () => {
      // Create a notification for other user
      const otherNotification = new Notification({
        user: otherUser.user._id,
        sender: testUser.user._id,
        type: 'follow',
        content: 'started following you',
        read: false,
        created_at: new Date()
      });
      await otherNotification.save();

      const response = await request(app)
        .delete(`/api/notifications/${otherNotification._id}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');

      // Verify notification was not deleted
      const notification = await Notification.findById(otherNotification._id);
      expect(notification).toBeTruthy();
    });

    it('should return 404 for non-existent notification', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/notifications/${nonExistentId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${notificationId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });
});
