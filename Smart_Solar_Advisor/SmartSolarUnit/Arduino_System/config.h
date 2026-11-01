#pragma once

// --------- DEVICE & PIN MAP (matches your wiring) ----------
#define PIN_DHT1          4      // DHT22 #1 data
#define PIN_DHT2          5      // DHT22 #2 data
#define PIN_RAIN1         32     // HW-028 #1 analog AO
#define PIN_RAIN2         33     // HW-028 #2 analog AO
#define PIN_DUST_LED_CTRL 23     // GP2Y1010 LED- (through 1k to this pin)
#define PIN_DUST_ANALOG   34     // GP2Y1010 Vo analog read
#define I2C_SDA           21     // BH1750 sensor 1 bus
#define I2C_SCL           22
#define I2C_SDA2          25     // BH1750 sensor 2 bus
#define I2C_SCL2          26
#define LED_BUILTIN       2      // ESP32 built-in LED (GPIO 2)

// BH1750 addresses: 0x23 (ADDR low) and 0x5C (ADDR high)
#define BH1750_ADDR_1     0x23
#define BH1750_ADDR_2     0x5C

// --------- FIREBASE ---------
// Firebase Realtime Database URL (without trailing slash)
// Format: https://[PROJECT_ID].firebaseio.com
#define FIREBASE_DB_URL   "https://project11-50079-default-rtdb.firebaseio.com"  // <-- Replace with your Firebase URL

// --------- APP SETTINGS ----------
#define DEVICE_ID         "SSA_ESP32_01"
#define SITE_ID           "SITE_COLOMBO_01"

#define LOOP_PERIOD_MS    (5UL * 60UL * 1000UL)  // 5 minutes
#define SAMPLE_AVG        5                      // per-cycle averaging per sensor

// Robust HTTP
#define HTTP_TIMEOUT_MS   8000
#define HTTP_RETRY_MAX    3

// Safety
#define ADC_SAMPLES       8    // oversampling for analog reads
