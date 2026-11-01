// // server.js
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
const axios = require('axios'); // Use require syntax for Node.js

// ...

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port: ${PORT}`);
// });

// module.exports = app;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    const allowedOrigins = ['http://localhost:8082', 'http://127.0.0.1:8082', 'https://fault.solaradvisor.site', 'https://www.fault.solaradvisor.site'];
    if (allowedOrigins.indexOf(origin) !== -1 || true) { // Temporarily allow all for debugging
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection with improved error handling and options
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGO_URI is not set in environment variables');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 Connection string:', mongoUri.replace(/:[^:@]+@/, ':****@')); // Hide password

    // Use connection string as-is (already includes database name in .env)
    const connectionUri = mongoUri;

    const connectionOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(connectionUri, connectionOptions);
    
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    console.log('🔗 Connection state:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
    
    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    // Create indexes for better performance
    try {
      const Device = require('./Models/Device');
      await Device.createIndexes();
      console.log('✅ Device indexes created/verified');
    } catch (indexError) {
      console.warn('⚠️ Index creation warning:', indexError.message);
    }

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Error details:', err);
    process.exit(1);
  }
};

// Connect to database (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Import Routes
const userRoutes = require('./Routes/userRoutes');
const deviceRoutes = require('./Routes/deviceRoutes');
const faultRoutes = require('./Routes/faultRoutes');

// Register Routes
app.use('/api/auth', userRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/faults', faultRoutes);

// Weather API Proxy Route (avoids CORS issues)
app.get('/api/weather/realtime', async (req, res) => {
  try {
    const response = await axios.get(
      'https://solaxcloud.dynac.space/api/v2/dataAccess/realtimeInfo/get',
      {
        timeout: 10000
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Weather API:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SolaX Proxy Route (avoids CORS issues) - Keep for backward compatibility
app.get('/api/solax/realtime', async (req, res) => {
  try {
    const response = await axios.post(
      'https://global.solaxcloud.com/api/v2/dataAccess/realtimeInfo/get',
      { wifiSn: process.env.SOLAX_WIFI_SN },
      {
        headers: {
          tokenId: process.env.SOLAX_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching SolaX API:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API Running'
  });
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    database: {
      status: dbStates[dbStatus] || 'unknown',
      connected: dbStatus === 1,
      databaseName: mongoose.connection.db?.databaseName || 'unknown'
    }
  });
});

// Database status endpoint
app.get('/api/db/status', async (req, res) => {
  try {
    const Device = require('./Models/Device');
    const User = require('./Models/Users');
    
    const deviceCount = await Device.countDocuments({});
    const userCount = await User.countDocuments({});
    
    res.json({
      success: true,
      connection: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        database: mongoose.connection.db?.databaseName,
        host: mongoose.connection.host
      },
      counts: {
        devices: deviceCount,
        users: userCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware - Must be last
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5051;
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;