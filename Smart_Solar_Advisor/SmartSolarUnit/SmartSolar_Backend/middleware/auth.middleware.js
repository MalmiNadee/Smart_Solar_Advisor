import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import UserModel from '../models/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // First, try to verify as Firebase Auth token
    let firebaseUser;
    let decoded;
    
    try {
      // Try Firebase Auth token verification
      firebaseUser = await admin.auth().verifyIdToken(token);
      decoded = {
        userId: firebaseUser.uid,
        email: firebaseUser.email,
        firebaseUid: firebaseUser.uid
      };
    } catch (firebaseError) {
      // If not a Firebase token, try our JWT token
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    }
    
    // Get user from Firestore to get role
    const user = await UserModel.getByEmail(decoded.email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = {
      userId: decoded.userId || decoded.firebaseUid,
      email: decoded.email,
      role: user.role || decoded.role
    };
    
    // Check if user is admin
    req.isAdmin = user.role === 'admin';
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

export { verifyToken, requireAdmin };
