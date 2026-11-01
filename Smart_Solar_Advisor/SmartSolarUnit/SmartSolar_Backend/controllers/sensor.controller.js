import SensorModel from '../models/sensor.model.js';

class SensorController {
  async getLatest(req, res) {
    try {
      const { deviceId } = req.params;
      const reading = await SensorModel.getLatestReading(deviceId);

      if (!reading) {
        return res.status(404).json({
          success: false,
          message: 'No sensor data found for this device'
        });
      }

      res.json({
        success: true,
        data: reading
      });
    } catch (error) {
      console.error('Get latest reading error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sensor data'
      });
    }
  }

  async getRecent(req, res) {
    try {
      const { deviceId } = req.params;
      const { limit = 50 } = req.query;
      
      const readings = await SensorModel.getRecentReadings(
        deviceId,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: readings,
        count: readings.length
      });
    } catch (error) {
      console.error('Get recent readings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sensor data'
      });
    }
  }

  async getByRange(req, res) {
    try {
      const { deviceId } = req.params;
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'startTime and endTime are required'
        });
      }

      const readings = await SensorModel.getReadingsInRange(
        deviceId,
        startTime,
        endTime
      );

      res.json({
        success: true,
        data: readings,
        count: readings.length
      });
    } catch (error) {
      console.error('Get readings by range error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sensor data'
      });
    }
  }

  async getDeviceData(req, res) {
    try {
      const { deviceId } = req.params;
      const data = await SensorModel.getDeviceData(deviceId);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Transform data for response
      const readings = Object.entries(data).map(([timestamp, reading]) => ({
        timestamp,
        ...reading
      }));

      res.json({
        success: true,
        data: readings,
        count: readings.length
      });
    } catch (error) {
      console.error('Get device data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch device data'
      });
    }
  }
}

export default new SensorController();
