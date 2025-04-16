const { createRouters } = require('../config/routeConfig');
const {
    getNotifications,
    getNotificationsByUserId,
    getUnreadNotificationCount,
    createNotification,
    createNotificationForAll,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} = require('../controllers/notificationController');
const { validate } = require('../middlewares/validationMiddleware');
const {
    getNotificationsRules,
    createNotificationRules,
    createNotificationForAllRules,
    markNotificationAsReadRules,
    deleteNotificationRules
} = require('../validations/notificationValidations');

// Create public and private routers
const { publicRouter, privateRouter } = createRouters();

// Public routes - no authentication required
publicRouter.get('/users/:user_id/notifications', validate(getNotificationsRules), getNotificationsByUserId);

// Private routes - authentication required
privateRouter.get('/notifications', getNotifications);
privateRouter.get('/notifications/unread/count', getUnreadNotificationCount);
privateRouter.post('/notifications', validate(createNotificationRules), createNotification);
privateRouter.post('/notifications/all', validate(createNotificationForAllRules), createNotificationForAll);
privateRouter.put('/notifications/:id/read', validate(markNotificationAsReadRules), markNotificationAsRead);
privateRouter.put('/notifications/read/all', markAllNotificationsAsRead);
privateRouter.delete('/notifications/:id', validate(deleteNotificationRules), deleteNotification);

module.exports = {
  publicNotificationRoutes: publicRouter,
  privateNotificationRoutes: privateRouter
};
