/**
 * Validation utilities for the application
 * This file provides common validation functions and sanitization methods
 */

const mongoose = require('mongoose');
const xss = require('xss');

/**
 * Validate MongoDB ObjectId
 * @param {string} value - The value to validate
 * @returns {boolean} True if the value is a valid ObjectId, false otherwise
 */
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

/**
 * Sanitize a string to prevent XSS attacks
 * @param {string} value - The string to sanitize
 * @returns {string} The sanitized string
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return xss(value);
};

/**
 * Sanitize an object to prevent XSS attacks
 * @param {Object} obj - The object to sanitize
 * @returns {Object} The sanitized object
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : 
        (item && typeof item === 'object') ? sanitizeObject(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} True if the email is valid, false otherwise
 */
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {Object} Object containing validation result and message
 */
const validatePasswordStrength = (password) => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  // Check for at least one uppercase letter, one lowercase letter, one number, and one special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
    return { 
      valid: false, 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
    };
  }
  
  return { valid: true, message: 'Password is strong' };
};

/**
 * Validate URL format and safety
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid and safe, false otherwise
 */
const isValidAndSafeUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    // Check for common protocols
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (error) {
    return false;
  }
};

/**
 * Validate file type based on allowed extensions
 * @param {string} filename - The filename to validate
 * @param {Array} allowedExtensions - Array of allowed file extensions
 * @returns {boolean} True if the file type is allowed, false otherwise
 */
const isAllowedFileType = (filename, allowedExtensions) => {
  if (!filename || typeof filename !== 'string') return false;
  const extension = filename.split('.').pop().toLowerCase();
  return allowedExtensions.includes(extension);
};

/**
 * Validate file size
 * @param {number} fileSize - The file size in bytes
 * @param {number} maxSize - The maximum allowed size in bytes
 * @returns {boolean} True if the file size is within limits, false otherwise
 */
const isAllowedFileSize = (fileSize, maxSize) => {
  return fileSize <= maxSize;
};

module.exports = {
  isValidObjectId,
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  validatePasswordStrength,
  isValidAndSafeUrl,
  isAllowedFileType,
  isAllowedFileSize
};
