const { createRouters } = require('../config/routeConfig');
const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship,
    getFriends,
    getPendingFriendRequests
} = require('../controllers/friendshipController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    getFriendsRules,
    acceptFriendRequestRules,
    deleteFriendshipRules
} = require('../validations/friendshipValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Public routes - no authentication required
publicRouter.get('/users/:user_id/friends', validate(getFriendsRules), getFriends);

// Private routes - authentication required
privateRouter.get('/friend-requests', getPendingFriendRequests);
privateRouter.post('/users/:user_id/friend-requests', validate(getFriendsRules), sendFriendRequest);
privateRouter.put('/friend-requests/:id/accept', validate(acceptFriendRequestRules), acceptFriendRequest);
privateRouter.put('/friend-requests/:id/reject', validate(acceptFriendRequestRules), rejectFriendRequest);
privateRouter.delete('/friendships/:id', validate(deleteFriendshipRules), removeFriendship);

module.exports = {
  publicFriendshipRoutes: publicRouter,
  privateFriendshipRoutes: privateRouter
};
