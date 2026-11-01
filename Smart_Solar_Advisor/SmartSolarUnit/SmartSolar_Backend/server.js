import express, { json, urlencoded } from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Initialize Firebase Admin SDK
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'config', 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://project11-50079-default-rtdb.firebaseio.com/'
});

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5001;

// WebSocket Server for realtime updates
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active connections
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  clients.set(clientId, ws);
  console.log(`WebSocket client connected: ${clientId}`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle subscription requests
      if (data.type === 'subscribe') {
        const { resource, params } = data;
        
        // Subscribe to Firebase Realtime Database changes
        if (resource === 'sensor' && params.deviceId) {
          const db = admin.database();
          const deviceRef = db.ref(`devices/${params.deviceId}`).limitToLast(1);
          
          deviceRef.on('child_added', (snapshot) => {
            ws.send(JSON.stringify({
              type: 'sensor_update',
              deviceId: params.deviceId,
              data: {
                timestamp: snapshot.key,
                ...snapshot.val()
              }
            }));
          });
        } else if (resource === 'prediction' && params.customerName && params.siteId) {
          const db = admin.database();
          const predRef = db.ref(`predicted_units/${params.customerName}/${params.siteId}`).limitToLast(1);
          
          predRef.on('child_added', (snapshot) => {
            ws.send(JSON.stringify({
              type: 'prediction_update',
              customerName: params.customerName,
              siteId: params.siteId,
              data: {
                timestamp: snapshot.key,
                ...snapshot.val()
              }
            }));
          });
        } else if (resource === 'sites') {
          // Subscribe to Firestore sites collection
          const firestore = admin.firestore();
          const sitesRef = firestore.collection('solar_sites');
          
          // Send initial data
          sitesRef.get().then((snapshot) => {
            const sites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ws.send(JSON.stringify({
              type: 'sites_update',
              data: sites
            }));
          });
          
          // Listen for real-time updates
          sitesRef.onSnapshot((snapshot) => {
            const sites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ws.send(JSON.stringify({
              type: 'sites_update',
              data: sites
            }));
          });
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(clientId);
  });
});

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import siteRoutes from './routes/site.routes.js';
import sensorRoutes from './routes/sensor.routes.js';
import predictionRoutes from './routes/prediction.routes.js';
import weatherRoutes from './routes/weather.routes.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/weather', weatherRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Smart Solar Advisor Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server available at ws://localhost:${PORT}/ws`);
});
