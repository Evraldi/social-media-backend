const request = require('supertest');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Message } = require('../models');
const { createTestUser, authHeader } = require('./helpers');

let mongoServer;
let testUser;
let otherUser;
let messageId;

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
    username: 'messageuser',
    email: 'messageuser@example.com'
  }, false); // Don't create profile automatically

  otherUser = await createTestUser({
    username: 'othermessageuser',
    email: 'othermessageuser@example.com'
  }, false); // Don't create profile automatically
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('MongoDB disconnected and server stopped');
});

describe('Message Routes', () => {
  describe('POST /api/messages', () => {
    it('should send a message successfully', async () => {
      const messageData = {
        receiver: otherUser.user._id,
        content: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/messages')
        .set(authHeader(testUser.token))
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('sender', testUser.user._id.toString());
      expect(response.body.data).toHaveProperty('receiver', otherUser.user._id.toString());
      expect(response.body.data).toHaveProperty('content', messageData.content);

      // Save message ID for later tests
      messageId = response.body.data._id;

      // Verify message was created in the database
      const message = await Message.findById(messageId);
      expect(message).toBeTruthy();
      expect(message.sender.toString()).toBe(testUser.user._id.toString());
      expect(message.receiver.toString()).toBe(otherUser.user._id.toString());
      expect(message.content).toBe(messageData.content);
    });

    it('should validate message data', async () => {
      const invalidData = {
        // Missing receiver
        content: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/messages')
        .set(authHeader(testUser.token))
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent receiver', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const messageData = {
        receiver: nonExistentId,
        content: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/messages')
        .set(authHeader(testUser.token))
        .send(messageData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const messageData = {
        receiver: otherUser.user._id,
        content: 'Hello, this is a test message'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(messageData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/messages/conversations', () => {
    beforeEach(async () => {
      // Create some test messages
      await Message.create([
        {
          sender: testUser.user._id,
          receiver: otherUser.user._id,
          content: 'Hello from test user',
          created_at: new Date(),
          read: false
        },
        {
          sender: otherUser.user._id,
          receiver: testUser.user._id,
          content: 'Hello from other user',
          created_at: new Date(),
          read: false
        }
      ]);
    });

    it('should get all conversations for a user', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1); // One conversation with otherUser

      // Conversation should have the other user's info
      expect(response.body.data[0]).toHaveProperty('user');
      expect(response.body.data[0].user).toHaveProperty('_id', otherUser.user._id.toString());
      expect(response.body.data[0]).toHaveProperty('lastMessage');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/messages/conversations');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/messages/:user_id', () => {
    beforeEach(async () => {
      // Create some test messages
      await Message.create([
        {
          sender: testUser.user._id,
          receiver: otherUser.user._id,
          content: 'Message 1',
          created_at: new Date(Date.now() - 2000),
          read: true
        },
        {
          sender: otherUser.user._id,
          receiver: testUser.user._id,
          content: 'Message 2',
          created_at: new Date(Date.now() - 1000),
          read: false
        },
        {
          sender: testUser.user._id,
          receiver: otherUser.user._id,
          content: 'Message 3',
          created_at: new Date(),
          read: false
        }
      ]);
    });

    it('should get all messages between two users', async () => {
      const response = await request(app)
        .get(`/api/messages/${otherUser.user._id}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);

      // Messages should be in chronological order (oldest first)
      expect(response.body.data[0].content).toBe('Message 1');
      expect(response.body.data[1].content).toBe('Message 2');
      expect(response.body.data[2].content).toBe('Message 3');
    });

    it('should mark received messages as read', async () => {
      // First get the messages to mark them as read
      await request(app)
        .get(`/api/messages/${otherUser.user._id}`)
        .set(authHeader(testUser.token));

      // Check if messages are marked as read
      const messages = await Message.find({
        sender: otherUser.user._id,
        receiver: testUser.user._id
      });

      expect(messages.length).toBe(1);
      expect(messages[0].read).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get(`/api/messages/${otherUser.user._id}`)
        .query({ page: 1, limit: 2 })
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('itemsPerPage', 2);
      expect(response.body.pagination).toHaveProperty('totalItems', 3);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/messages/${nonExistentId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/messages/${otherUser.user._id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('DELETE /api/messages/:id', () => {
    beforeEach(async () => {
      // Create a test message
      const message = new Message({
        sender: testUser.user._id,
        receiver: otherUser.user._id,
        content: 'Test message to delete',
        created_at: new Date(),
        read: false
      });
      await message.save();
      messageId = message._id;
    });

    it('should delete a message successfully', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify message was deleted
      const message = await Message.findById(messageId);
      expect(message).toBeNull();
    });

    it('should not allow deleting another user\'s received message', async () => {
      // Create a message where testUser is the receiver
      const receivedMessage = new Message({
        sender: otherUser.user._id,
        receiver: testUser.user._id,
        content: 'Message from other user',
        created_at: new Date(),
        read: false
      });
      await receivedMessage.save();

      const response = await request(app)
        .delete(`/api/messages/${receivedMessage._id}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');

      // Verify message was not deleted
      const message = await Message.findById(receivedMessage._id);
      expect(message).toBeTruthy();
    });

    it('should return 404 for non-existent message', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/messages/${nonExistentId}`)
        .set(authHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });
});
