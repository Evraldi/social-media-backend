const express = require('express');
const { sendMessage, getMessages, updateMessage, updateMessageStatus, deleteMessage, getConversation } = require('../controllers/messageController');
const router = express.Router();

router.post('/', sendMessage);
router.get('/:sender_id/:receiver_id', getMessages);
router.get('/conversation/:sender_id/:receiver_id', getConversation);
router.put('/:id', updateMessage);
router.put('/status/:id', updateMessageStatus);
router.delete('/:id', deleteMessage);

module.exports = router;
