const sequelize = require('../config/database');
const User = require('./user');
const Post = require('./post');
const Comment = require('./comment');
const Like = require('./like');
const Friendship = require('./friendship');
const Message = require('./message');
const Follower = require('./follower');
const Media = require('./media');
const Notification = require('./notification');
const RefreshToken = require('./RefreshToken');
const UserProfile = require('./UserProfile');

// User Relationships
User.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Like, { foreignKey: 'user_id' });
Like.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Friendship, { foreignKey: 'requester_id', as: 'SentFriendRequests' });
User.hasMany(Friendship, { foreignKey: 'receiver_id', as: 'ReceivedFriendRequests' });

User.hasMany(Message, { foreignKey: 'sender_id', as: 'Sender' });
User.hasMany(Message, { foreignKey: 'receiver_id', as: 'Receiver' });

User.hasMany(Follower, { foreignKey: 'follower_id', as: 'Follower' });
User.hasMany(Follower, { foreignKey: 'following_id', as: 'Following' });

User.hasMany(Media, { foreignKey: 'user_id' });
Media.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(UserProfile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
UserProfile.belongsTo(User, { foreignKey: 'user_id' });


// Post Relationships
Post.hasMany(Comment, { foreignKey: 'post_id' });
Comment.belongsTo(Post, { foreignKey: 'post_id' });

Post.hasMany(Like, { foreignKey: 'post_id' });
Like.belongsTo(Post, { foreignKey: 'post_id' });

Post.hasMany(Media, { foreignKey: 'post_id' });
Media.belongsTo(Post, { foreignKey: 'post_id' });

UserProfile.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(UserProfile, { foreignKey: 'user_id' });

// Sync DB
const initDb = async () => {
    try {
        await sequelize.sync({ force: false });
        console.log("Database synchronized");
    } catch (error) {
        console.error("Unable to synchronize the database:", error);
    }
};

module.exports = { sequelize, User, Post, Comment, Like, Friendship, Message, Follower, Media, Notification, RefreshToken, UserProfile, initDb };
