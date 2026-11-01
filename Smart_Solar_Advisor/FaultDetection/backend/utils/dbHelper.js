// Database helper utilities
const mongoose = require('mongoose');

/**
 * Convert various userId formats to ObjectId for consistent querying
 */
const normalizeUserId = (userId) => {
  if (!userId) return null;
  
  try {
    // If already ObjectId, return as is
    if (userId instanceof mongoose.Types.ObjectId) {
      return userId;
    }
    
    // If string and valid ObjectId, convert
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      return new mongoose.Types.ObjectId(userId);
    }
    
    // Return original if can't convert
    return userId;
  } catch (e) {
    return userId;
  }
};

/**
 * Build flexible userId query that handles multiple formats
 */
const buildUserIdQuery = (userId) => {
  const normalized = normalizeUserId(userId);
  const userIdStr = userId?.toString();
  
  return {
    $or: [
      { userId: normalized },
      { userId: userIdStr },
      { userId: userId },
      { $expr: { $eq: [{ $toString: "$userId" }, userIdStr] } }
    ]
  };
};

/**
 * Test database connection and return status
 */
const testConnection = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      connected: state === 1,
      state: states[state] || 'unknown',
      database: mongoose.connection.db?.databaseName || 'unknown',
      host: mongoose.connection.host || 'unknown'
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
};

module.exports = {
  normalizeUserId,
  buildUserIdQuery,
  testConnection
};
