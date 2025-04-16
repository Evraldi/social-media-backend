/**
 * Middleware to check if the user has the required role
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const checkRole = (roles = []) => {
    return (req, res, next) => {
        // If no roles are required, allow access
        if (roles.length === 0) {
            return next();
        }
        
        // Check if user exists in request (set by verifyAccessToken middleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Authentication required',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if user has the required role
        const hasRole = roles.includes(req.user.role);
        if (!hasRole) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. Insufficient permissions',
                timestamp: new Date().toISOString()
            });
        }
        
        // User has the required role, proceed
        next();
    };
};

/**
 * Middleware to check if the user is the owner of the resource
 * @param {Function} getResourceOwnerId - Function to get the owner ID from the request
 * @returns {Function} Express middleware function
 */
const checkOwnership = (getResourceOwnerId) => {
    return async (req, res, next) => {
        try {
            // Check if user exists in request (set by verifyAccessToken middleware)
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized. Authentication required',
                    timestamp: new Date().toISOString()
                });
            }
            
            // Get the owner ID of the resource
            const ownerId = await getResourceOwnerId(req);
            
            // Check if the user is the owner
            if (req.user._id.toString() !== ownerId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden. You do not have permission to access this resource',
                    timestamp: new Date().toISOString()
                });
            }
            
            // User is the owner, proceed
            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            return res.status(500).json({
                success: false,
                message: 'An unexpected error occurred. Please try again later.',
                timestamp: new Date().toISOString()
            });
        }
    };
};

module.exports = {
    checkRole,
    checkOwnership
};
