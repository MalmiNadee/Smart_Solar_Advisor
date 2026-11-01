import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Verify email and password using Firebase Auth
    let firebaseUser;
    try {
      // Get user by email from Firebase Auth
      firebaseUser = await admin.auth().getUserByEmail(email);
    } catch (error) {
      // User not found in Firebase Auth
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password by attempting to sign in
    // Note: Firebase Admin SDK doesn't have a direct password verification method
    // We need to use the REST API or create a custom token
    // For now, we'll verify the user exists and get their role from Firestore
    const user = await UserModel.getByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password using Firebase Auth REST API
    // Note: The signInWithPassword endpoint requires the Web API Key
    // We'll try to get it from environment variable, or extract from service account if possible
    let firebaseApiKey = process.env.FIREBASE_API_KEY || 'AIzaSyD85ffkSKNDVAgEXLZOubnqBbTh_mtmjm4';

    // If not in env, try to get from service account (though it's typically not there)
    if (!firebaseApiKey) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: FIREBASE_API_KEY is required. Please add it to your .env file. Get it from Firebase Console → Project Settings → General → Web API Key'
      });
    }

    try {
      // Use Firebase Identity Platform REST API with Web API Key
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
          })
        }
      );

      const authData = await response.json();

      if (!response.ok || authData.error) {
        // Log the actual error for debugging
        console.error('Firebase Auth error:', authData.error);

        if (authData.error?.message?.includes('API key') || authData.error?.message?.includes('INVALID_API_KEY')) {
          return res.status(500).json({
            success: false,
            message: 'Server configuration error: Invalid FIREBASE_API_KEY. Please check your .env file and get the correct Web API Key from Firebase Console → Project Settings → General → Web API Key'
          });
        }

        return res.status(401).json({
          success: false,
          message: authData.error?.message || 'Invalid email or password'
        });
      }

      // User authenticated successfully, get role from Firestore
      const userRole = user.role || 'site_owner';

      // Generate our own JWT token with user info and role
      const token = jwt.sign(
        {
          userId: firebaseUser.uid,
          email: user.email,
          role: userRole,
          firebaseUid: firebaseUser.uid
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: firebaseUser.uid,
            email: user.email,
            role: userRole,
            name: user.name
          }
        }
      });
    } catch (error) {
      console.error('Firebase Auth verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login'
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Try to get user by ID first (Firebase UID), then by email as fallback
    let user = await UserModel.getById(userId);
    if (!user && userEmail) {
      user = await UserModel.getByEmail(userEmail);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        ...user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, customer_name } = req.body;

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (customer_name !== undefined) updateData.customer_name = customer_name;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Update user in Firestore
    const updatedUser = await UserModel.update(userId, updateData);

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.name,
        customer_name: updatedUser.customer_name,
        ...updatedUser
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get Firebase API key
    const firebaseApiKey = process.env.FIREBASE_API_KEY || 'AIzaSyD85ffkSKNDVAgEXLZOubnqBbTh_mtmjm4';

    // First verify current password
    try {
      const verifyResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
            password: currentPassword,
            returnSecureToken: true
          })
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || verifyData.error) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Current password is correct, now update password
      const firebaseUser = await admin.auth().getUser(userId);
      const idToken = verifyData.idToken;

      // Update password using Firebase Admin SDK
      await admin.auth().updateUser(userId, {
        password: newPassword
      });

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

export const verifyAdmin = async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not an admin user'
      });
    }

    res.json({
      success: true,
      data: {
        isAdmin: true,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Verify admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify admin status'
    });
  }
};
