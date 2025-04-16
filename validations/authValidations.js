const { body } = require('express-validator');
const { isValidEmail } = require('../utils/validationUtils');

/**
 * Custom validator for password strength
 * @param {string} password - The password to validate
 * @returns {boolean} True if the password is strong, false otherwise
 */
const isStrongPassword = (password) => {
    // Check for minimum length
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        throw new Error('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
        throw new Error('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        throw new Error('Password must contain at least one special character');
    }

    return true;
};

// Signup validation rules
const signupRules = [
    body('username')
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .trim()
        .escape(),

    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .custom((value) => {
            if (!isValidEmail(value)) {
                throw new Error('Invalid email format');
            }
            return true;
        })
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .custom(isStrongPassword)
];

// Login validation rules
const loginRules = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .custom((value) => {
            if (!isValidEmail(value)) {
                throw new Error('Invalid email format');
            }
            return true;
        })
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Refresh token validation rules
const refreshTokenRules = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
        .isString()
        .withMessage('Refresh token must be a string')
        .isLength({ min: 10 })
        .withMessage('Invalid refresh token format')
];

// Logout validation rules
const logoutRules = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
        .isString()
        .withMessage('Refresh token must be a string')
        .isLength({ min: 10 })
        .withMessage('Invalid refresh token format')
];

// Password reset request validation rules
const passwordResetRequestRules = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .custom((value) => {
            if (!isValidEmail(value)) {
                throw new Error('Invalid email format');
            }
            return true;
        })
        .normalizeEmail()
];

// Password reset validation rules
const passwordResetRules = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .isString()
        .withMessage('Reset token must be a string')
        .isLength({ min: 10 })
        .withMessage('Invalid reset token format'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .custom(isStrongPassword),

    body('confirmPassword')
        .notEmpty()
        .withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

module.exports = {
    signupRules,
    loginRules,
    refreshTokenRules,
    logoutRules,
    passwordResetRequestRules,
    passwordResetRules
};
