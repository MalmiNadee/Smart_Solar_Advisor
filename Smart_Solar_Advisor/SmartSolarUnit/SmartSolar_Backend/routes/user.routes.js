import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Get all users (admin only)
router.get('/', verifyToken, requireAdmin, UserController.getAll);

// Get single user by ID (admin only)
router.get('/:userId', verifyToken, requireAdmin, UserController.getById);

// Create new user (admin only)
router.post('/', verifyToken, requireAdmin, UserController.create);

// Update user (admin only)
router.put('/:userId', verifyToken, requireAdmin, UserController.update);

// Delete user (admin only)
router.delete('/:userId', verifyToken, requireAdmin, UserController.delete);

export default router;

