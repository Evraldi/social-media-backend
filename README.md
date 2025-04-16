# Social Media Backend API

A robust and scalable RESTful API for a social media platform built with Node.js, Express, MongoDB, and Redis.

## Features

- **Authentication System**: Secure JWT-based authentication with refresh tokens
- **User Management**: User registration, profiles, and account management
- **Social Features**: Posts, comments, likes, friendships, followers
- **Messaging**: Private messaging between users
- **Media Handling**: Upload and manage media files
- **Notifications**: Real-time notifications for social interactions
- **Performance Optimizations**:
  - Redis caching for improved response times
  - MongoDB query optimization
  - Database indexing for faster queries
- **Security Features**:
  - JWT authentication with RS256 algorithm
  - Password hashing with bcrypt
  - Input validation and sanitization
  - Protection against common web vulnerabilities
  - Rate limiting to prevent abuse

## Tech Stack

- **Node.js & Express**: Server framework
- **MongoDB**: Primary database
- **Redis**: Caching layer
- **JWT**: Authentication tokens
- **Bcrypt**: Password hashing
- **Multer**: File uploads
- **Express Validator**: Input validation
- **Jest & Supertest**: Testing framework

## Project Structure

```
social-media-backend/
├── config/             # Configuration files
│   ├── database.js     # MongoDB connection
│   ├── redis.js        # Redis connection
│   ├── routeConfig.js  # Route configuration utilities
│   └── routeRegistry.js # Route registration
├── controllers/        # Request handlers
├── middlewares/        # Express middlewares
│   ├── authMiddleware.js # Authentication middleware
│   ├── cacheMiddleware.js # Redis caching middleware
│   ├── errorMiddleware.js # Error handling middleware
│   ├── rateLimitMiddleware.js # Rate limiting
│   ├── securityMiddleware.js # Security headers, etc.
│   └── validationMiddleware.js # Input validation
├── models/             # MongoDB models
├── routes/             # API routes
│   ├── authRoutes.js   # Authentication routes
│   ├── userRoutes.js   # User management routes
│   ├── postRoutes.js   # Post management routes
│   └── ...             # Other feature routes
├── tests/              # Test suites
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── performance/    # Performance tests
│   └── manual/         # Manual testing scripts
├── uploads/            # Media file uploads
├── utils/              # Utility functions
├── validations/        # Input validation rules
├── .env                # Environment variables
├── .env.example        # Example environment variables
├── app.js              # Express application
└── package.json        # Project dependencies
```

## API Endpoints

The API is organized into public and private routes:

### Authentication

- `POST /api/signup` - Register a new user
- `POST /api/login` - Authenticate a user
- `POST /api/refresh-token` - Refresh access token
- `POST /api/logout` - Logout user

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:user_id/profiles` - Get user profiles
- `GET /api/users/:user_id/profiles/:id` - Get specific user profile
- `PUT /api/users/:user_id/profiles/:id` - Update user profile
- `DELETE /api/users/:user_id/profiles/:id` - Delete user profile

### Posts

- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get post by ID
- `GET /api/users/:user_id/posts` - Get posts by user ID
- `POST /api/posts` - Create a new post
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post

### Comments

- `GET /api/posts/:post_id/comments` - Get comments for a post
- `POST /api/posts/:post_id/comments` - Add a comment to a post
- `PUT /api/posts/:post_id/comments/:id` - Update a comment
- `DELETE /api/posts/:post_id/comments/:id` - Delete a comment

### Likes

- `GET /api/posts/:post_id/likes` - Get likes for a post
- `POST /api/posts/:post_id/likes` - Like a post
- `DELETE /api/posts/:post_id/likes` - Unlike a post

### Friendships

- `GET /api/friendships` - Get user's friendships
- `POST /api/friendships` - Send friend request
- `PUT /api/friendships/:id` - Accept/reject friend request
- `DELETE /api/friendships/:id` - Remove friendship

### Messages

- `GET /api/messages` - Get user's messages
- `GET /api/conversations` - Get user's conversations
- `POST /api/messages` - Send a message
- `PUT /api/messages/:id` - Update message status
- `DELETE /api/messages/:id` - Delete a message

### Followers

- `GET /api/followers` - Get user's followers
- `GET /api/following` - Get users the current user is following
- `POST /api/followers/:user_id` - Follow a user
- `DELETE /api/followers/:user_id` - Unfollow a user

### Notifications

- `GET /api/notifications` - Get user's notifications
- `PUT /api/notifications/:id` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete a notification

### Media

- `POST /api/media` - Upload media
- `GET /api/media` - Get user's media
- `DELETE /api/media/:id` - Delete media

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Access Token**: Short-lived token (15 minutes) used for API requests
2. **Refresh Token**: Long-lived token (7 days) used to obtain new access tokens

Authentication flow:
1. User logs in with credentials and receives access and refresh tokens
2. Access token is included in the Authorization header for API requests
3. When the access token expires, the refresh token is used to obtain a new access token
4. Logout invalidates both tokens

## Caching

The API uses Redis for caching to improve performance:

- GET requests are cached with configurable TTL (Time To Live)
- Cache is automatically invalidated when related data is modified
- Cache keys are organized by resource type for targeted invalidation
- Cache hit/miss is indicated in the response

## Performance Optimizations

- **Database Indexing**: Optimized MongoDB indexes for frequently queried fields
- **Query Optimization**: Efficient MongoDB queries with projection and lean()
- **Pagination**: All list endpoints support pagination
- **Caching**: Redis caching for frequently accessed data
- **Parallel Queries**: Promise.all for concurrent database operations

## Security Features

- **Input Validation**: Comprehensive validation for all API inputs
- **Data Sanitization**: XSS protection and input sanitization
- **Rate Limiting**: Prevents abuse and brute force attacks
- **Security Headers**: Protection against common web vulnerabilities
- **Parameter Pollution Prevention**: Protects against HTTP parameter pollution
- **Content Type Validation**: Ensures valid content types for requests

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- Redis (or Memurai for Windows)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/Evraldi/social-media-backend.git
   cd social-media-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create environment variables:
   ```
   cp .env.example .env
   ```

4. Generate RSA keys for JWT:
   ```
   openssl genrsa -out private.key 2048
   openssl rsa -in private.key -pubout -out public.key
   ```

5. Start the server:
   ```
   npm run dev
   ```

### Environment Variables

Configure the following in your `.env` file:

```
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/social_media_db

# JWT Keys Configuration
PRIVATE_KEY_PATH=private.key
PUBLIC_KEY_PATH=public.key

# Server Configuration
PORT=3000
CORS_ORIGIN=http://localhost:3001

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# JWT Configuration
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

## Testing

The project includes comprehensive test suites:

- **Unit Tests**: Test individual components
  ```
  npm run test:unit
  ```

- **Integration Tests**: Test API endpoints
  ```
  npm run test:integration
  ```

- **Performance Tests**: Test caching and optimizations
  ```
  npm run test:performance
  ```

