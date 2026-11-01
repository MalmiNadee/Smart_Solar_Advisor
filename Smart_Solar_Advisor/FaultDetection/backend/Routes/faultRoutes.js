const express = require('express');
const router = express.Router();
const faultController = require('../Controllers/faultController');
const authMiddleware = require('../Middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Detect fault for a device
router.post('/detect/:deviceId', faultController.detectFault);

// Get fault history for a device (optionally filtered by date)
router.get('/history/:deviceId', faultController.getFaultHistory);

// Get all fault history for user
router.get('/history', faultController.getAllFaultHistory);

// Get latest fault status for a device
router.get('/status/:deviceId', faultController.getLatestFaultStatus);

// Get forecast for a device
router.get('/forecast/:deviceId', faultController.getForecast);

module.exports = router;
