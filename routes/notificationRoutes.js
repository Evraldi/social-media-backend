const express = require('express');
const { getNotifications, createNotification } = require('../controllers/notificationController');
const router = express.Router();

router.get('/:user_id', getNotifications);
router.post('/', createNotification);

module.exports = router;
