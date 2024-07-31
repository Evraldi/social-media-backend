const express = require('express');
const multer = require('multer');
const { initDb } = require('./models');

const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const likeRoutes = require('./routes/likeRoutes');
const friendshipRoutes = require('./routes/friendshipRoutes');
const messageRoutes = require('./routes/messageRoutes');
const followerRoutes = require('./routes/followerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/friendships', friendshipRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/followers', followerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/media', mediaRoutes);

const startServer = async () => {
    await initDb();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

startServer();
