import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Initialize Firebase Admin SDK
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'config', 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://project11-50079-default-rtdb.firebaseio.com/'
});

const db = admin.database();
const firestore = admin.firestore();

// Sample Users (Firestore + Firebase Auth)
// Default password for all users: "password123"
const DEFAULT_PASSWORD = 'password123';

const sampleUsers = [
  {
    email: 'admin@solar.com',
    password: DEFAULT_PASSWORD,
    role: 'admin',
    name: 'System Administrator',
  },
  {
    email: 'john.doe@solar.com',
    password: DEFAULT_PASSWORD,
    role: 'site_owner',
    name: 'John Doe',
  },
  {
    email: 'jane.smith@solar.com',
    password: DEFAULT_PASSWORD,
    role: 'site_owner',
    name: 'Jane Smith',
  }
];

// Sample Solar Sites (Firestore)
const sampleSites = [
  {
    id: 'site_001',
    site_name: 'Green Energy Farm - Main',
    customer_name: 'dilshan_home',
    device_id: 'SSA_ESP32_01',
    system_kw: 50,
    panel_type: 'Monocrystalline 400W',
    panel_count: 125,
    inverter_type: 'String Inverter',
    inverter_capacity_kw: 50,
    status: 'running',
    created_at: '2024-01-15'
  },
  {
    id: 'site_002',
    site_name: 'Solar Park - East Wing',
    customer_name: 'Solar Park Industries',
    device_id: 'SSA_ESP32_02',
    system_kw: 30,
    panel_type: 'Polycrystalline 350W',
    panel_count: 86,
    inverter_type: 'Micro Inverter',
    inverter_capacity_kw: 30,
    status: 'running',
    created_at: '2024-02-20'
  },
  {
    id: 'site_003',
    site_name: 'Residential Complex - Block A',
    customer_name: 'Residential Energy Co',
    device_id: 'SSA_ESP32_03',
    system_kw: 20,
    panel_type: 'Thin Film 300W',
    panel_count: 67,
    inverter_type: 'String Inverter',
    inverter_capacity_kw: 20,
    status: 'completed',
    created_at: '2024-03-10'
  },
  {
    id: 'site_004',
    site_name: 'Commercial Building - Downtown',
    customer_name: 'Commercial Solar Ltd',
    device_id: 'SSA_ESP32_04',
    system_kw: 100,
    panel_type: 'Monocrystalline 450W',
    panel_count: 222,
    inverter_type: 'Central Inverter',
    inverter_capacity_kw: 100,
    status: 'maintenance',
    created_at: '2024-01-05'
  },
  {
    id: 'site_005',
    site_name: 'Industrial Plant - Warehouse',
    customer_name: 'Industrial Power Solutions',
    device_id: 'SSA_ESP32_05',
    system_kw: 200,
    panel_type: 'Monocrystalline 500W',
    panel_count: 400,
    inverter_type: 'Central Inverter',
    inverter_capacity_kw: 200,
    status: 'running',
    created_at: '2024-04-01'
  }
];

// Generate sample sensor data (Realtime Database)
// Format: devices/{deviceId}/{timestamp}
// Firebase Realtime DB keys can't contain ".", ":", "/", etc.
// So we encode: 2025-10-25T18:37:36+0500 -> 2025-10-25T18-37-36+0500 (replace : with -)
function generateSensorData(deviceId, hours = 24) {
  const data = {};
  const now = new Date();
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    // Format: 2025-10-25T18:37:36+0500 (ISO with timezone offset)
    // Firebase Realtime DB keys can't contain ":", ".", "/", etc.
    // So we encode: replace ":" with "-" for the key
    let isoString = timestamp.toISOString().replace('Z', '+0500');
    // Remove milliseconds if present (the .077 part)
    isoString = isoString.replace(/\.\d{3}/, '');
    // Replace colons with dashes for Firebase key compatibility
    const timestampKey = isoString.replace(/:/g, '-');
    // Keep original format for the timestamp field in data
    const timestampValue = isoString;
    
    // Generate realistic sensor values
    const hour = timestamp.getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    
    // BH1750 light sensor
    const lux1 = isDaytime ? Math.random() * 50000 + 20000 : Math.random() * 1000;
    const lux2 = isDaytime ? Math.random() * 50000 + 20000 : Math.random() * 1000;
    const lux_avg = (lux1 + lux2) / 2;
    
    // DHT sensors (temperature and humidity)
    const baseTemp = 20 + Math.sin((hour - 6) / 12 * Math.PI) * 10 + (Math.random() - 0.5) * 5;
    const baseHum = 50 + Math.sin((hour - 6) / 12 * Math.PI) * 20 + (Math.random() - 0.5) * 10;
    
    const temp1 = baseTemp + (Math.random() - 0.5) * 2;
    const temp2 = baseTemp + (Math.random() - 0.5) * 2;
    const hum1 = baseHum + (Math.random() - 0.5) * 5;
    const hum2 = baseHum + (Math.random() - 0.5) * 5;
    
    const temp_avg = (temp1 + temp2) / 2;
    const hum_avg = (hum1 + hum2) / 2;
    
    // Dust sensor
    const dustRaw = Math.round(400 + Math.random() * 300);
    const dustVoltage = Math.round((dustRaw / 4095) * 5 * 1000) / 1000;
    const dustMgM3 = dustRaw < 500 ? 0 : Math.round((dustRaw - 500) / 100 * 1000) / 1000;
    
    // Rain sensor
    const rainRaw1 = Math.round(3000 + Math.random() * 1000);
    const rainRaw2 = Math.round(3000 + Math.random() * 1000);
    const rainPct1 = rainRaw1 > 3500 ? 0 : Math.round((3500 - rainRaw1) / 35);
    const rainPct2 = rainRaw2 > 3500 ? 0 : Math.round((3500 - rainRaw2) / 35);
    
    data[timestampKey] = {
      bh1750: {
        lux1: Math.round(lux1 * 100) / 100,
        lux2: Math.round(lux2 * 100) / 100,
        lux_avg: Math.round(lux_avg * 100) / 100
      },
      device_id: deviceId,
      dht1: {
        'hum_%': Math.round(hum1 * 10) / 10,
        temp_c: Math.round(temp1 * 10) / 10
      },
      dht2: {
        'hum_%': Math.round(hum2 * 10) / 10,
        temp_c: Math.round(temp2 * 10) / 10
      },
      dht_avg: {
        'hum_%': Math.round(hum_avg * 10) / 10,
        temp_c: Math.round(temp_avg * 10) / 10
      },
      dust: {
        mg_m3: dustMgM3,
        raw: dustRaw,
        voltage: dustVoltage
      },
      rain: {
        pct1: rainPct1,
        pct2: rainPct2,
        raw1: rainRaw1,
        raw2: rainRaw2
      },
      rssi: Math.round(-20 - Math.random() * 30),
      timestamp: timestampValue // Store original ISO format in the data
    };
  }
  
  return data;
}

// Generate sample prediction data (Realtime Database)
// Format: predicted_units/{customerName}/{siteId}/{timestamp}
// Timestamp format: YYYYMMDD_HHMMSS (e.g., 20251221_194238)
function generatePredictionData(customerName, siteId, deviceId, days = 7) {
  const data = {};
  const now = new Date();
  
  for (let day = 0; day <= days; day++) {
    const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    // Generate predictions for each 5-minute interval (288 per day)
    for (let interval = 0; interval < 288; interval++) {
      const minutes = interval * 5;
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const second = Math.floor(Math.random() * 60);
      
      // Format: YYYYMMDD_HHMMSS
      const timestamp = `${dateStr}_${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}${String(second).padStart(2, '0')}`;
      
      // Generate realistic prediction based on time of day
      const isDaytime = hour >= 6 && hour <= 18;
      const solarIntensity = isDaytime 
        ? Math.sin((hour - 6) / 12 * Math.PI) 
        : 0;
      
      // Generate features used for prediction
      const irradiance = isDaytime ? (solarIntensity * 50000 + Math.random() * 20000) : Math.random() * 1000;
      const temperature = 20 + Math.sin((hour - 6) / 12 * Math.PI) * 10 + (Math.random() - 0.5) * 5;
      const humidity = 50 + Math.sin((hour - 6) / 12 * Math.PI) * 20 + (Math.random() - 0.5) * 10;
      const dustLevel = Math.random() * 5;
      const rainfall = Math.random() * 50;
      
      const predicted_kwh_5min = solarIntensity > 0
        ? (solarIntensity * 0.5 + Math.random() * 0.2) * 0.1
        : 0;
      
      data[timestamp] = {
        device_id: deviceId,
        features_used: {
          dust_level: Math.round(dustLevel * 1000000) / 1000000,
          humidity: Math.round(humidity * 100) / 100,
          irradiance: Math.round(irradiance * 100) / 100,
          rainfall: Math.round(rainfall * 100) / 100,
          temperature: Math.round(temperature * 10) / 10
        },
        interval: '5_min',
        panel_area_m2: 25,
        predicted_kwh_5min: Math.round(predicted_kwh_5min * 1000000) / 1000000,
        unit: 'kWh'
      };
    }
  }
  
  return data;
}

async function seedData() {
  console.log('🌱 Starting data seeding...\n');

  try {
    // Seed Users to Firebase Auth and Firestore
    console.log('📝 Seeding users to Firebase Auth and Firestore...');
    for (const user of sampleUsers) {
      const { password, ...userData } = user;
      
      try {
        // Create user in Firebase Authentication
        const firebaseUser = await admin.auth().createUser({
          email: user.email,
          password: password,
          emailVerified: false,
          disabled: false
        });

        // Store user metadata in Firestore (using Firebase UID as document ID)
        await firestore.collection('users').doc(firebaseUser.uid).set({
          email: user.email,
          name: user.name,
          role: user.role,
          firebase_uid: firebaseUser.uid,
          created_at: new Date().toISOString()
        });

        console.log(`  ✓ Created user: ${user.email} (password: ${password})`);
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`  ⚠ User already exists: ${user.email}`);
        } else {
          console.error(`  ✗ Failed to create user ${user.email}:`, error.message);
        }
      }
    }

    // Seed Sites to Firestore
    console.log('\n🏢 Seeding solar sites to Firestore...');
    for (const site of sampleSites) {
      const { id, ...siteData } = site;
      await firestore.collection('solar_sites').doc(id).set(siteData);
      console.log(`  ✓ Created site: ${site.site_name}`);
    }

    // Seed Sensor Data to Realtime Database
    console.log('\n📡 Seeding sensor data to Realtime Database...');
    for (const site of sampleSites) {
      const sensorData = generateSensorData(site.device_id, 24);
      await db.ref(`devices/${site.device_id}`).set(sensorData);
      console.log(`  ✓ Created sensor data for device: ${site.device_id} (${Object.keys(sensorData).length} readings)`);
    }

    // Seed Prediction Data to Realtime Database
    console.log('\n🔮 Seeding prediction data to Realtime Database...');
    for (const site of sampleSites) {
      const predictionData = generatePredictionData(site.customer_name, site.id, site.device_id, 7);
      await db.ref(`predicted_units/${site.customer_name}/${site.id}`).set(predictionData);
      console.log(`  ✓ Created predictions for ${site.customer_name}/${site.id} (${Object.keys(predictionData).length} predictions)`);
    }

    console.log('\n✅ Data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Users: ${sampleUsers.length}`);
    console.log(`  - Sites: ${sampleSites.length}`);
    console.log(`  - Sensor devices: ${sampleSites.length}`);
    console.log(`  - Prediction sets: ${sampleSites.length}`);
    console.log('\n🔑 Login credentials (all users):');
    console.log('  Email: admin@solar.com | Password: password123');
    console.log('  Email: john.doe@solar.com | Password: password123');
    console.log('  Email: jane.smith@solar.com | Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();

