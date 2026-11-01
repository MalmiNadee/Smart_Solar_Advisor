# Seed Data Script

This script populates your Firebase project with sample data for testing and development.

## What It Does

The seed script creates:

### Firebase Authentication:
- **Users** - 3 sample users (1 admin, 2 site owners) created in Firebase Auth

### Firestore Collections:
- **users** - User metadata (name, role) linked to Firebase Auth UIDs
- **solar_sites** - 5 sample solar installation sites

### Realtime Database:
- **devices/{deviceId}** - 24 hours of sensor readings for each device
- **predicted_units/{customerName}/{siteId}** - 7 days of prediction data for each site

## Prerequisites

1. Make sure you have `backend/config/serviceAccountKey.json` file
2. Ensure Firebase Admin SDK is initialized correctly
3. Your Firebase project has both Firestore and Realtime Database enabled

## How to Run

### Option 1: Direct Node Command

```bash
cd backend
node scripts/seedData.js
```

### Option 2: From Project Root

```bash
node backend/scripts/seedData.js
```

## Expected Output

```
🌱 Starting data seeding...

📝 Seeding users to Firestore...
  ✓ Created user: admin@solar.com (password: password123)
  ✓ Created user: john.doe@solar.com (password: password123)
  ✓ Created user: jane.smith@solar.com (password: password123)

🏢 Seeding solar sites to Firestore...
  ✓ Created site: Green Energy Farm - Main
  ✓ Created site: Solar Park - East Wing
  ✓ Created site: Residential Complex - Block A
  ✓ Created site: Commercial Building - Downtown
  ✓ Created site: Industrial Plant - Warehouse

📡 Seeding sensor data to Realtime Database...
  ✓ Created sensor data for device: ESP32_001 (25 readings)
  ✓ Created sensor data for device: ESP32_002 (25 readings)
  ...

🔮 Seeding prediction data to Realtime Database...
  ✓ Created predictions for Green Energy Corp/site001 (2304 predictions)
  ...

✅ Data seeding completed successfully!

📊 Summary:
  - Users: 3
  - Sites: 5
  - Sensor devices: 5
  - Prediction sets: 5

🔑 Login credentials (all users):
  Email: admin@solar.com | Password: password123
  Email: john.doe@solar.com | Password: password123
  Email: jane.smith@solar.com | Password: password123
```

## Sample Data Details

### Users
All users have the default password: **`password123`**

- **admin@solar.com** - Admin user (Password: `password123`)
- **john.doe@solar.com** - Site owner (Password: `password123`)
- **jane.smith@solar.com** - Site owner (Password: `password123`)

**Note:** Users are created in Firebase Authentication with email/password. User roles and metadata are stored in Firestore, linked by Firebase UID. Passwords are managed by Firebase Auth, not stored in Firestore.

### Solar Sites
1. **Green Energy Farm - Main** (50kW, running)
2. **Solar Park - East Wing** (30kW, running)
3. **Residential Complex - Block A** (20kW, completed)
4. **Commercial Building - Downtown** (100kW, maintenance)
5. **Industrial Plant - Warehouse** (200kW, running)

### Sensor Data
- 24 hours of readings per device
- Realistic values based on time of day
- Includes: irradiance (lux), temperature, humidity, dust, rain, signal strength

### Prediction Data
- 7 days of 5-minute interval predictions
- Realistic solar generation patterns
- Based on time of day and solar intensity

## Troubleshooting

### Error: Cannot find module
Make sure you're running from the correct directory and all dependencies are installed:
```bash
npm install
```

### Error: Permission denied
Check that your `serviceAccountKey.json` has the correct permissions in Firebase Console.

### Error: Database not found
Ensure your Firebase project has:
- Firestore Database enabled
- Realtime Database enabled
- Correct database URL in the script

## Re-running the Script

The script will **overwrite** existing data. If you want to add more data or modify existing data, edit the arrays in `seedData.js` before running.

## Customizing Sample Data

Edit the arrays in `seedData.js`:
- `sampleUsers` - Add/modify users
- `sampleSites` - Add/modify solar sites
- Adjust `generateSensorData()` parameters for more/less sensor readings
- Adjust `generatePredictionData()` parameters for more/less prediction days

