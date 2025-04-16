const { redisClient, isRedisConnected } = require('../config/redis');

// Cache key registry set name
const CACHE_REGISTRY = 'cache:registry';

/**
 * Cache middleware for Express routes
 * @param {number} duration - Cache duration in seconds
 * @returns {Function} Express middleware function
 */
const cache = (duration = 60) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if Redis is not connected
    if (!isRedisConnected()) {
      return next();
    }

    // Create a unique cache key based on the request URL and query parameters
    const cacheKey = `cache:${req.originalUrl}`;

    try {
      // Try to get cached response
      const cachedResponse = await redisClient.get(cacheKey);

      if (cachedResponse) {
        // If cache hit, parse and send the cached response
        const parsedResponse = JSON.parse(cachedResponse);
        return res.status(200).json({
          ...parsedResponse,
          cache: true
        });
      }

      // If cache miss, capture the response
      const originalSend = res.send;
      res.send = function (body) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          try {
            // Store the response in Redis
            const response = JSON.parse(body);
            redisClient.setEx(cacheKey, duration, JSON.stringify(response));

            // Add the cache key to the registry for easier invalidation
            redisClient.sAdd(CACHE_REGISTRY, cacheKey);

            // Also add a category-specific registry entry for more targeted invalidation
            const urlParts = req.originalUrl.split('/');
            if (urlParts.length >= 2) {
              const category = urlParts[2]; // e.g., 'posts', 'users', etc.
              if (category) {
                redisClient.sAdd(`${CACHE_REGISTRY}:${category}`, cacheKey);
              }
            }
          } catch (error) {
            console.error('Error caching response:', error);
          }
        }
        originalSend.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Clear cache for a specific pattern
 * @param {string} pattern - Cache key pattern to clear
 * @returns {Promise<void>}
 */
const clearCache = async (pattern) => {
  if (!isRedisConnected()) {
    return;
  }

  try {
    let keysCleared = 0;

    // First try to use the registry for the specific category
    if (!pattern.includes('*')) {
      // Check if we have a registry for this category
      const registryKey = `${CACHE_REGISTRY}:${pattern}`;
      const members = await redisClient.sMembers(registryKey);

      if (members.length > 0) {
        // Delete all keys in the registry
        for (const key of members) {
          await redisClient.del(key);
          // Also remove from the main registry
          await redisClient.sRem(CACHE_REGISTRY, key);
        }

        // Clear the category registry
        await redisClient.del(registryKey);

        keysCleared += members.length;
        console.log(`Cleared ${members.length} cache entries from registry: ${registryKey}`);
      }
    }

    // Also try the traditional pattern matching as a fallback
    const keys = await redisClient.keys(`cache:${pattern.includes('/api/') ? pattern : `/api/${pattern}`}`);

    if (keys.length > 0) {
      // Delete each key individually
      for (const key of keys) {
        await redisClient.del(key);
        // Also remove from registries
        await redisClient.sRem(CACHE_REGISTRY, key);

        // Try to determine the category and remove from category registry
        const urlParts = key.split('/');
        if (urlParts.length >= 3) {
          const category = urlParts[2]; // e.g., 'posts', 'users', etc.
          if (category) {
            await redisClient.sRem(`${CACHE_REGISTRY}:${category}`, key);
          }
        }
      }

      keysCleared += keys.length;
      console.log(`Cleared ${keys.length} cache entries for pattern: ${pattern}`);
    }

    // If no keys were cleared, try with exact URL
    if (keysCleared === 0) {
      // Try with exact URL for common patterns
      const exactKey = `cache:/api/${pattern.replace('*', '')}`;
      const exists = await redisClient.exists(exactKey);

      if (exists) {
        await redisClient.del(exactKey);
        await redisClient.sRem(CACHE_REGISTRY, exactKey);

        // Try to determine the category and remove from category registry
        const urlParts = exactKey.split('/');
        if (urlParts.length >= 3) {
          const category = urlParts[2];
          if (category) {
            await redisClient.sRem(`${CACHE_REGISTRY}:${category}`, exactKey);
          }
        }

        console.log(`Cleared exact cache key: ${exactKey}`);
        keysCleared++;
      }
    }

    if (keysCleared === 0) {
      console.log(`No cache entries found for pattern: ${pattern}`);
    } else {
      console.log(`Total cache entries cleared: ${keysCleared}`);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

module.exports = {
  cache,
  clearCache
};
