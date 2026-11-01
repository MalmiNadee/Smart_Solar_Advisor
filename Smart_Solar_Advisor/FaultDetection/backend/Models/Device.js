// // models/Device.js
// const mongoose = require('mongoose');

// const deviceSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: [true, 'User ID is required'],
//     index: true
//   },
//   deviceName: {
//     type: String,
//     required: [true, 'Device name is required'],
//     trim: true,
//     minlength: [3, 'Device name must be at least 3 characters'],
//     maxlength: [100, 'Device name cannot exceed 100 characters']
//   },
//   apiUrl: {
//     type: String,
//     required: [true, 'API URL is required'],
//     trim: true,
//     validate: {
//       validator: function(v) {
//         try {
//           new URL(v);
//           return true;
//         } catch {
//           return false;
//         }
//       },
//       message: 'Please provide a valid URL'
//     }
//   },
//   wifiSN: {
//     type: String,
//     required: [true, 'WiFi SN is required'],
//     trim: true,
//     uppercase: true,
//     minlength: [5, 'WiFi SN must be at least 5 characters'],
//     maxlength: [50, 'WiFi SN cannot exceed 50 characters'],
//     match: [/^[A-Z0-9]+$/, 'WiFi SN must contain only uppercase letters and numbers']
//   },
//   tokenId: {
//     type: String,
//     required: [true, 'Token ID is required'],
//     trim: true
//   },
//   description: {
//     type: String,
//     trim: true,
//     maxlength: [500, 'Description cannot exceed 500 characters'],
//     default: ''
//   },
//   capacity: {
//     type: Number,
//     min: [0, 'Capacity cannot be negative'],
//     default: null
//   },
//   location: {
//     type: String,
//     trim: true,
//     maxlength: [200, 'Location cannot exceed 200 characters'],
//     default: ''
//   },
//   status: {
//     type: String,
//     enum: ['active', 'inactive', 'maintenance'],
//     default: 'active'
//   },
//   lastSyncTime: {
//     type: Date,
//     default: null
//   }
// }, {
//   timestamps: true // Automatically adds createdAt and updatedAt
// });

// // Compound index for userId + wifiSN (unique per user)
// deviceSchema.index({ userId: 1, wifiSN: 1 }, { unique: true });

// // Compound index for userId + deviceName (unique per user)
// deviceSchema.index({ userId: 1, deviceName: 1 }, { unique: true });

// // Update lastSyncTime helper
// deviceSchema.methods.updateSyncTime = function() {
//   this.lastSyncTime = Date.now();
//   return this.save();
// };

// // Virtual for device age (days)
// deviceSchema.virtual('deviceAge').get(function() {
//   const now = new Date();
//   const created = new Date(this.createdAt);
//   const diffDays = Math.ceil((now - created) / (1000 * 60 * 60 * 24));
//   return diffDays;
// });

// // Include virtuals in JSON output
// deviceSchema.set('toJSON', { virtuals: true });
// deviceSchema.set('toObject', { virtuals: true });

// module.exports = mongoose.model('Device', deviceSchema);


const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Index is created via schema.index() below to avoid duplicates
  },
  deviceName: {
    type: String,
    required: true,
    trim: true
  },
  apiUrl: {
    type: String,
    required: true,
    trim: true
  },
  wifiSN: {
    type: String,
    required: true,
    trim: true,
    unique: true
    // Index is created via schema.index() below to avoid duplicates
  },
  tokenId: {
    type: String,
    required: true,
    trim: true
  },
  // Store latest device data from API
  latestData: {
    inverterSN: String,
    acpower: Number,
    yieldtoday: Number,
    yieldtotal: Number,
    feedinpower: Number,
    feedinenergy: Number,
    consumeenergy: Number,
    soc: Number,
    inverterType: String,
    inverterStatus: String,
    uploadTime: String,
    batPower: Number,
    powerdc1: Number,
    powerdc2: Number,
    powerdc3: Number,
    powerdc4: Number,
    batStatus: String,
    utcDateTime: String,
    lastFetched: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
deviceSchema.index({ userId: 1 });
// wifiSN already has unique: true which creates an index automatically
deviceSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user's devices sorted by date

module.exports = mongoose.model('Device', deviceSchema);