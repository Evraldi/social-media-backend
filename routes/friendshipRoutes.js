const express = require('express');
const { sendFriendRequest, acceptFriendRequest, deleteFriendship } = require('../controllers/friendshipController');
const router = express.Router();

router.post('/friend-requests', sendFriendRequest);
router.put('/friend-requests/:id/accept', acceptFriendRequest);
router.delete('/friend-requests/:id', deleteFriendship);


module.exports = router;
