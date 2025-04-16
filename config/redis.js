const { createClient } = require('redis');
require('dotenv').config();

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

// Handle Redis connection events
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Redis connection error:', error);
    // Don't exit process, allow app to function without Redis
  }
};

// Check if Redis is connected
const isRedisConnected = () => {
  return redisClient.isReady;
};

module.exports = {
  redisClient,
  connectRedis,
  isRedisConnected
};
