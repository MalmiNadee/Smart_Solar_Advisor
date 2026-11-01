const mongoose = require('mongoose');

const faultHistorySchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  // Weather/environmental data from API
  weatherData: {
    month: Number,
    day: Number,
    hour: Number,
    minute: Number,
    windSpeed: Number,
    sunshine: Number,
    airPressure: Number,
    radiation: Number,
    airTemperature: Number,
    relativeAirHumidity: Number,
    last_updated: String
  },
  // Solar system data
  solarData: {
    acpower: Number,
    yieldtoday: Number,
    yieldtotal: Number,
    consumeenergy: Number,
    inverterSN: String,
    inverterType: String,
    inverterStatus: String,
    batPower: Number,
    soc: Number
  },
  // ML prediction results
  prediction: {
    predictedProduction: Number,
    actualProduction: Number,
    faultDetected: {
      type: Boolean,
      default: false
    },
    faultType: {
      type: String,
      enum: ['none', 'low_production', 'overheating', 'low_radiation', 'other'],
      default: 'none'
    },
    faultSeverity: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'none'
    },
    deviation: Number // Percentage difference between predicted and actual
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
faultHistorySchema.index({ deviceId: 1, timestamp: -1 });
faultHistorySchema.index({ userId: 1, timestamp: -1 });
faultHistorySchema.index({ timestamp: -1 });

module.exports = mongoose.model('FaultHistory', faultHistorySchema);
