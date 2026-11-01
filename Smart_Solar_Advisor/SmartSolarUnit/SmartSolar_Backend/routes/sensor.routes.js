import { Router } from 'express';
import SensorController from '../controllers/sensor.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// Get all device data
router.get('/:deviceId', verifyToken, SensorController.getDeviceData);

// Get latest sensor reading
router.get('/:deviceId/latest', verifyToken, SensorController.getLatest);

// Get recent readings with limit
router.get('/:deviceId/recent', verifyToken, SensorController.getRecent);

// Get readings by time range
router.get('/:deviceId/range', verifyToken, SensorController.getByRange);

export default router;
