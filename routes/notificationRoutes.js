const express = require('express');
const { getNotifications, createNotification, createNotificationForAll, markNotificationAsRead, deleteNotification } = require('../controllers/notificationController');
const router = express.Router();

router.get('/:user_id', getNotifications);
router.post('/', createNotification);
router.post('/all', createNotificationForAll);
router.put('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
