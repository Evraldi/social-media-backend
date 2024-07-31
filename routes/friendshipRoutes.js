const express = require('express');
const { sendFriendRequest, acceptFriendRequest, deleteFriendship } = require('../controllers/friendshipController');
const router = express.Router();

router.post('/', sendFriendRequest);
router.put('/:id/accept', acceptFriendRequest);
router.delete('/:id', deleteFriendship);

module.exports = router;
