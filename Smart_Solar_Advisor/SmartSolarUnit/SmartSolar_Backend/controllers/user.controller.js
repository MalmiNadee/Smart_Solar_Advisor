import admin from 'firebase-admin';
import UserModel from '../models/user.model.js';

class UserController {
  async getAll(req, res) {
    try {
      const users = await UserModel.getAll();
      
      // Remove password from response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json({
        success: true,
        data: sanitizedUsers,
        count: sanitizedUsers.length
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }

  async getById(req, res) {
    try {
      const { userId } = req.params;
      const user = await UserModel.getById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user'
      });
    }
  }

  async create(req, res) {
    try {
      const { email, password, name, role = 'site_owner' } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and name are required'
        });
      }

      // Check if user already exists in Firestore
      const existingUser = await UserModel.getByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create user in Firebase Authentication
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().createUser({
          email,
          password,
          emailVerified: false,
          disabled: false
        });
      } catch (firebaseError) {
        // Check if user already exists in Firebase Auth
        if (firebaseError.code === 'auth/email-already-exists') {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists in Firebase Auth'
          });
        }
        throw firebaseError;
      }

      // Store user data in Firestore (without password)
      const userId = firebaseUser.uid; // Use Firebase UID as document ID
      const userData = {
        email,
        name,
        role,
        firebase_uid: firebaseUser.uid,
        created_at: new Date().toISOString()
      };

      const newUser = await UserModel.create(userId, userData);

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Create user error:', error);
      
      // If Firestore creation failed but Firebase Auth user was created, clean up
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  }

  async update(req, res) {
    try {
      const { userId } = req.params;
      const { email, password, name, role } = req.body;

      const existingUser = await UserModel.getById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update Firebase Auth user if needed
      const firebaseUid = existingUser.firebase_uid || userId;
      const firebaseUpdates = {};
      
      if (email && email !== existingUser.email) {
        firebaseUpdates.email = email;
      }
      if (password) {
        firebaseUpdates.password = password;
      }

      if (Object.keys(firebaseUpdates).length > 0) {
        try {
          await admin.auth().updateUser(firebaseUid, firebaseUpdates);
        } catch (firebaseError) {
          console.error('Firebase Auth update error:', firebaseError);
          return res.status(400).json({
            success: false,
            message: firebaseError.message || 'Failed to update user in Firebase Auth'
          });
        }
      }

      // Update Firestore user data
      const updateData = {};
      if (email) updateData.email = email;
      if (name) updateData.name = name;
      if (role) updateData.role = role;

      const updatedUser = await UserModel.update(userId, updateData);

      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  async delete(req, res) {
    try {
      const { userId } = req.params;

      const existingUser = await UserModel.getById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete from Firebase Auth
      const firebaseUid = existingUser.firebase_uid || userId;
      try {
        await admin.auth().deleteUser(firebaseUid);
      } catch (firebaseError) {
        // If user doesn't exist in Firebase Auth, continue with Firestore deletion
        if (firebaseError.code !== 'auth/user-not-found') {
          console.error('Firebase Auth delete error:', firebaseError);
        }
      }

      // Delete from Firestore
      await UserModel.delete(userId);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }
}

export default new UserController();

