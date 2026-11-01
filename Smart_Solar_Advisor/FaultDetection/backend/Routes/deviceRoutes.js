const express = require('express');
const router = express.Router();
const deviceController = require('../Controllers/deviceController');
const authMiddleware = require('../Middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Add new device
router.post('/add', deviceController.addDevice);

// Get all devices
router.get('/', deviceController.getDevices);

// Get single device
router.get('/:id', deviceController.getDeviceById);

// Refresh device data
router.post('/:id/refresh', deviceController.refreshDeviceData);

// Update device
router.put('/:id', deviceController.updateDevice);

// Delete device
router.delete('/:id', deviceController.deleteDevice);

// Refresh all devices
router.post('/refresh-all', deviceController.refreshAllDevices);

// Debug endpoint - get all devices (temporary, for debugging)
router.get('/debug/all', async (req, res) => {
  try {
    const Device = require('../Models/Device');
    const devices = await Device.find({}).select('-__v').limit(10);
    res.json({
      success: true,
      count: devices.length,
      devices: devices,
      currentUserId: req.user.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;