const express = require('express');
const { sendMessage, getMessages } = require('../controllers/messageController');
const router = express.Router();

router.post('/', sendMessage);
router.get('/:sender_id/:receiver_id', getMessages);

module.exports = router;
