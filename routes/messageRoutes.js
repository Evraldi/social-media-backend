const { createRouters } = require('../config/routeConfig');
const { cache, clearCache } = require('../middlewares/cacheMiddleware');
const {
    sendMessage,
    getMessages,
    getConversations,
    updateMessage,
    updateMessageStatus,
    deleteMessage,
    getConversation
} = require('../controllers/messageController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    sendMessageRules,
    getMessagesRules,
    getConversationRules,
    updateMessageRules,
    updateMessageStatusRules,
    deleteMessageRules
} = require('../validations/messageValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// All message routes require authentication - no public routes
// Private routes - authentication required

// Add cache invalidation middleware for write operations
const invalidateMessageCache = (req, res, next) => {
    // After response is sent, clear the cache
    res.on('finish', async () => {
        // Only invalidate cache if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                const user_id = req.user._id;
                const receiver_id = req.body.receiver || req.params.user_id;

                // Clear user's conversations cache
                await clearCache(`messages/conversations*`);

                // Clear specific conversation caches if we have receiver_id
                if (receiver_id) {
                    await clearCache(`messages/${receiver_id}*`);
                    await clearCache(`messages/${user_id}*`);
                }

                console.log('Message cache invalidated');
            } catch (error) {
                console.error('Error invalidating cache:', error);
            }
        }
    });
    next();
};

// Add caching to GET routes (short TTL for messages - 15 seconds)
privateRouter.get('/messages/conversations', cache(15), getConversations);
privateRouter.get('/messages/:user_id', cache(15), getMessages);
privateRouter.get('/messages/conversation/:sender_id/:receiver_id', validate(getConversationRules), cache(15), getConversation);

// Add cache invalidation to write operations
privateRouter.post('/messages', validate(sendMessageRules), invalidateMessageCache, sendMessage);
privateRouter.put('/messages/:id', validate(updateMessageRules), invalidateMessageCache, updateMessage);
privateRouter.patch('/messages/:id/status', validate(updateMessageStatusRules), invalidateMessageCache, updateMessageStatus);
privateRouter.delete('/messages/:id', validate(deleteMessageRules), invalidateMessageCache, deleteMessage);

module.exports = {
  // No public routes for messages
  publicMessageRoutes: publicRouter,
  privateMessageRoutes: privateRouter
};
