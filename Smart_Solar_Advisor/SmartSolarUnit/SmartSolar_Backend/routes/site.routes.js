import { Router } from 'express';
import SiteController from '../controllers/site.controller.js';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Get site statistics
router.get('/stats', verifyToken, SiteController.getStats);

// Get all sites (with optional filters)
router.get('/', verifyToken, SiteController.getAll);

// Get single site by ID
router.get('/:siteId', verifyToken, SiteController.getById);

// Create new site (admin only)
router.post('/', verifyToken, requireAdmin, SiteController.create);

// Update site (admin only)
router.put('/:siteId', verifyToken, requireAdmin, SiteController.update);

// Delete site (admin only)
router.delete('/:siteId', verifyToken, requireAdmin, SiteController.delete);

export default router;
