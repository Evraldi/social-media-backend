/**
 * Generate pagination options for MongoDB queries
 * @param {Object} query - Express request query object
 * @returns {Object} Pagination options
 */
const getPaginationOptions = (query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    return {
        page,
        limit,
        skip
    };
};

/**
 * Generate pagination metadata for response
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
const getPaginationMetadata = (totalItems, page, limit) => {
    return {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit
    };
};

module.exports = {
    getPaginationOptions,
    getPaginationMetadata
};
