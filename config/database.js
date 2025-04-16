const mongoose = require('mongoose');
require('dotenv').config();

// Track connection status
let isConnected = false;

/**
 * Connect to MongoDB using a singleton pattern
 * This ensures only one connection is active at a time
 */
const connectDB = async () => {
    // If already connected, return the existing connection
    if (isConnected) {
        return mongoose.connection;
    }

    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
        console.log('MongoDB connected successfully');
        return connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

/**
 * Check if MongoDB is connected
 */
const isMongoConnected = () => {
    return isConnected;
};

module.exports = { connectDB, isMongoConnected };
