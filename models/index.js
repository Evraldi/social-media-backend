const { connectDB, isMongoConnected } = require('../config/database');
const User = require('./user');
const Post = require('./post');
const Comment = require('./comment');
const UserProfile = require('./UserProfile');
const RefreshToken = require('./RefreshToken');
const Follower = require('./follower');
const Like = require('./like');
const Friendship = require('./friendship');
const Message = require('./message');
const Media = require('./media');
const Notification = require('./notification');

// Initialize database connection
const initDb = async () => {
    try {
        // Only connect if not already connected
        if (!isMongoConnected()) {
            await connectDB();
        }
    } catch (error) {
        console.error("Unable to connect to MongoDB:", error);
        process.exit(1);
    }
};

module.exports = {
    User,
    Post,
    Comment,
    UserProfile,
    RefreshToken,
    Follower,
    Like,
    Friendship,
    Message,
    Media,
    Notification,
    initDb
};
