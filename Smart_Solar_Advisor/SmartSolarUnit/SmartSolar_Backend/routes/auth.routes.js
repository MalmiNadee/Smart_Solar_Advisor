import { Router } from 'express';

import { login, getProfile, updateProfile, changePassword, verifyAdmin } from '../controllers/auth.controller.js';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Login endpoint (no auth required)
router.post('/login', login);

// Get current user profile
router.get('/profile', verifyToken, getProfile);

// Update current user profile
router.put('/profile', verifyToken, updateProfile);

// Change password
router.post('/change-password', verifyToken, changePassword);

// Verify admin status
router.get('/verify-admin', verifyToken, verifyAdmin);

export default router;
