const express = require('express');
const { sendMessage, getMessages, updateMessage, updateMessageStatus, deleteMessage, getConversation } = require('../controllers/messageController');
const router = express.Router();

router.post('/messages', sendMessage);
router.get('/messages', getMessages);
router.get('/messages/conversations', getConversation);
router.put('/messages/:id', updateMessage);
router.patch('/messages/:id/status', updateMessageStatus);
router.delete('/messages/:id', deleteMessage);


module.exports = router;
