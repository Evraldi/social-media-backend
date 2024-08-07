const express = require('express');
const { getNotifications, createNotification, createNotificationForAll, markNotificationAsRead, deleteNotification } = require('../controllers/notificationController');
const router = express.Router();

router.get('/users/:user_id/notifications', getNotifications);
router.post('/notifications', createNotification);
router.post('/notifications/all', createNotificationForAll);
router.put('/notifications/:id/read', markNotificationAsRead);
router.delete('/notifications/:id', deleteNotification);


module.exports = router;
