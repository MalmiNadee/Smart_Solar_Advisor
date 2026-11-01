"""
Add Sample Data to Firebase Realtime Database
Generates sample sensor data and predictions for dates 2026/01/01 to 2026/01/07
Time range: 6 AM to 6 PM, every 5 minutes
"""

import firebase_admin
from firebase_admin import credentials, db
import os
import random
import math
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
cred = credentials.Certificate("firebase_key.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(
        cred,
        {"databaseURL": os.getenv("FIREBASE_DB_URL", "https://project11-50079-default-rtdb.firebaseio.com")}
    )

# Configuration
DEVICE_ID = "SSA_ESP32_01"
CUSTOMER_NAME = "dilshan"
SITE_ID = "site_001"

# Data ranges
TEMP_MIN = 28
TEMP_MAX = 33
RAIN_MIN = 0
RAIN_MAX = 100
HUMIDITY_MIN = 60
HUMIDITY_MAX = 95
LUX_MIN = 80
LUX_MAX = 300
DUST_MIN = 0
DUST_MAX = 0.1
PREDICTED_KWH_MIN = 0.12
PREDICTED_KWH_MAX = 0.16

def generate_random_value(min_val, max_val, decimals=2):
    """Generate a random value within the specified range"""
    return round(random.uniform(min_val, max_val), decimals)

def format_timestamp(dt):
    """
    Format timestamp for both devices and predicted_units database keys
    Format: YYYYMMDD_HHMMSS (e.g., 20260101_060000)
    """
    return dt.strftime("%Y%m%d_%H%M%S")

def format_iso_timestamp(dt):
    """
    Format timestamp for device data timestamp field
    Format: 2026-01-08T00:24:13+0500 (ISO 8601 with correct colons in time and +0500 offset)
    """
    # Convert to timezone +0500 (Sri Lanka time)
    tz_offset = timezone(timedelta(hours=5))
    dt_local = dt.replace(tzinfo=tz_offset)
    # Format ISO string with no separator in offset
    iso_string = dt_local.strftime("%Y-%m-%dT%H:%M:%S%z")
    # Ensure the offset is in +0500 format (should be due to strftime)
    return iso_string

def calculate_time_factor(hour, minute):
    """
    Calculate time factor for realistic daily patterns
    Returns a value between 0 and 1 based on time of day
    Peak at noon (12:00), minimum at 6 AM and 6 PM
    Realistic pattern: Low in morning, peaks at lunch, low in afternoon
    """
    minutes_since_start = (hour - 6) * 60 + minute
    total_minutes = 12 * 60
    if minutes_since_start < 0 or minutes_since_start > total_minutes:
        return 0.0
    normalized_time = minutes_since_start / total_minutes
    time_factor = math.sin(normalized_time * math.pi)
    if time_factor < 0.1:
        time_factor = time_factor * 0.5
    return max(0.0, min(1.0, time_factor))

def get_realistic_lux(hour, minute, previous_lux=None):
    time_factor = calculate_time_factor(hour, minute)
    base_lux = LUX_MIN + (LUX_MAX - LUX_MIN) * time_factor
    variation = (LUX_MAX - LUX_MIN) * 0.03 * random.uniform(-1, 1)
    if previous_lux is not None:
        max_change = previous_lux * 0.08
        change = base_lux - previous_lux
        if abs(change) > max_change:
            change = max_change if change > 0 else -max_change
        new_lux = previous_lux + change + variation
    else:
        new_lux = base_lux + variation
    return round(max(LUX_MIN, min(LUX_MAX, new_lux)), 2)

def get_realistic_temp(hour, minute, previous_temp=None):
    time_factor = calculate_time_factor(hour, minute)
    base_temp = TEMP_MIN + (TEMP_MAX - TEMP_MIN) * time_factor * 0.85
    variation = random.uniform(-0.4, 0.4)
    if previous_temp is not None:
        max_change = 0.25
        change = base_temp - previous_temp
        if abs(change) > max_change:
            change = max_change if change > 0 else -max_change
        new_temp = previous_temp + change + variation
    else:
        new_temp = base_temp + variation
    return round(max(TEMP_MIN, min(TEMP_MAX, new_temp)), 1)

def get_realistic_humidity(hour, minute, temp, previous_humidity=None):
    temp_factor = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN) if TEMP_MAX > TEMP_MIN else 0
    base_humidity = HUMIDITY_MAX - (HUMIDITY_MAX - HUMIDITY_MIN) * temp_factor * 0.6
    variation = random.uniform(-2, 2)
    if previous_humidity is not None:
        max_change = 1.0
        change = base_humidity - previous_humidity
        if abs(change) > max_change:
            change = max_change if change > 0 else -max_change
        new_humidity = previous_humidity + change + variation
    else:
        new_humidity = base_humidity + variation
    return round(max(HUMIDITY_MIN, min(HUMIDITY_MAX, new_humidity)), 1)

def get_realistic_dust(previous_dust=None):
    base_dust = (DUST_MIN + DUST_MAX) / 2
    variation = (DUST_MAX - DUST_MIN) * 0.2 * random.uniform(-1, 1)
    if previous_dust is not None:
        max_change = (DUST_MAX - DUST_MIN) * 0.1
        change = base_dust - previous_dust
        if abs(change) > max_change:
            change = max_change if change > 0 else -max_change
        new_dust = previous_dust + change + variation
    else:
        new_dust = base_dust + variation
    return round(max(DUST_MIN, min(DUST_MAX, new_dust)), 2)

def get_realistic_predicted_kwh(lux, previous_kwh=None):
    lux_factor = (lux - LUX_MIN) / (LUX_MAX - LUX_MIN) if LUX_MAX > LUX_MIN else 0
    base_kwh = PREDICTED_KWH_MIN + (PREDICTED_KWH_MAX - PREDICTED_KWH_MIN) * lux_factor
    variation = (PREDICTED_KWH_MAX - PREDICTED_KWH_MIN) * 0.02 * random.uniform(-1, 1)
    if previous_kwh is not None:
        max_change = (PREDICTED_KWH_MAX - PREDICTED_KWH_MIN) * 0.01
        change = base_kwh - previous_kwh
        if abs(change) > max_change:
            change = max_change if change > 0 else -max_change
        new_kwh = previous_kwh + change + variation
    else:
        new_kwh = base_kwh + variation
    return round(max(PREDICTED_KWH_MIN, min(PREDICTED_KWH_MAX, new_kwh)), 6)

def generate_device_data(timestamp_dt, previous_values=None):
    hour = timestamp_dt.hour
    minute = timestamp_dt.minute
    prev_lux = previous_values.get('lux') if previous_values else None
    prev_temp = previous_values.get('temp') if previous_values else None
    prev_humidity = previous_values.get('humidity') if previous_values else None
    prev_dust = previous_values.get('dust') if previous_values else None
    lux = get_realistic_lux(hour, minute, prev_lux)
    temp = get_realistic_temp(hour, minute, prev_temp)
    humidity = get_realistic_humidity(hour, minute, temp, prev_humidity)
    dust = get_realistic_dust(prev_dust)
    rain = 100  # Always use 100 for rain
    # Format timestamp for the timestamp field (ISO format: 2026-01-08T00:24:13+0500)
    timestamp_value = format_iso_timestamp(timestamp_dt)
    device_data = {
        "device_id": DEVICE_ID,
        "timestamp": timestamp_value,
        "dht_avg": {
            "temp_c": temp,
            "hum_%": humidity
        },
        "dht1": {
            "temp_c": temp + generate_random_value(-1, 1, 1),
            "hum_%": humidity + generate_random_value(-2, 2, 1)
        },
        "dht2": {
            "temp_c": temp + generate_random_value(-1, 1, 1),
            "hum_%": humidity + generate_random_value(-2, 2, 1)
        },
        "bh1750": {
            "lux1": lux,
            "lux2": lux,
            "lux_avg": lux
        },
        "rain": {
            "pct1": int(rain),
            "pct2": int(rain + generate_random_value(-5, 5, 0)),
            "raw1": int(3500 - (rain * 35)),
            "raw2": int(3500 - ((rain + generate_random_value(-5, 5, 0)) * 35))
        },
        "dust": {
            "mg_m3": dust,
            "raw": int(500 + (dust * 100)),
            "voltage": round((500 + (dust * 100)) / 4095 * 5, 3)
        },
        "rssi": int(generate_random_value(-50, -20, 0)),
        "uptime_s": int((timestamp_dt - datetime(2026, 1, 1, 6, 0, 0)).total_seconds()),
        "site_id": "SITE_COLOMBO_01"
    }
    return device_data, {
        'lux': lux,
        'temp': temp,
        'humidity': humidity,
        'dust': dust
    }

def generate_prediction_data(timestamp_dt, lux, temp, humidity, dust, previous_kwh=None):
    predicted_kwh = get_realistic_predicted_kwh(lux, previous_kwh)
    rain = 100  # Always use 100 for rain
    prediction_data = {
        "device_id": DEVICE_ID,
        "predicted_kwh_5min": predicted_kwh,
        "interval": "5_min",
        "unit": "kWh",
        "panel_area_m2": 25,
        "features_used": {
            "temperature": temp,
            "rainfall": rain,
            "humidity": humidity,
            "irradiance": lux,  # For backwards compatibility; in reality, this is lux in range 0-300
            "dust_level": dust
        }
    }
    return prediction_data, predicted_kwh

def add_sample_data():
    print("🚀 Starting to add sample data to Firebase Realtime Database...")
    print(f"📅 Date range: 2026/01/01 to 2026/01/07")
    print(f"⏰ Time range: 6 AM to 6 PM (every 5 minutes)")
    print(f"📊 Device ID: {DEVICE_ID}")
    print(f"👤 Customer: {CUSTOMER_NAME}")
    print(f"🏢 Site ID: {SITE_ID}\n")
    
    devices_ref = db.reference(f"devices/{DEVICE_ID}")
    predictions_ref = db.reference(f"predicted_units/{CUSTOMER_NAME}/{SITE_ID}")
    
    start_date = datetime(2026, 2, 19, 6, 0, 0)
    end_date = datetime(2026, 2, 19, 18, 0, 0)
    
    current_date = start_date
    total_records = 0
    
    while current_date <= end_date:
        day_start = current_date.replace(hour=6, minute=0, second=0)
        day_end = current_date.replace(hour=18, minute=0, second=0)
        
        current_time = day_start
        day_records = 0
        
        previous_values = None
        previous_kwh = None
        
        print(f"📅 Processing {current_date.strftime('%Y-%m-%d')}...")
        
        while current_time <= day_end:
            device_data, current_values = generate_device_data(current_time, previous_values)
            device_timestamp_key = format_timestamp(current_time)
            devices_ref.child(device_timestamp_key).set(device_data)
            
            prediction_data, predicted_kwh = generate_prediction_data(
                current_time,
                current_values['lux'],
                current_values['temp'],
                current_values['humidity'],
                current_values['dust'],
                previous_kwh
            )
            prediction_timestamp_key = format_timestamp(current_time)
            predictions_ref.child(prediction_timestamp_key).set(prediction_data)
            
            previous_values = current_values
            previous_kwh = predicted_kwh
            
            day_records += 1
            total_records += 1
            
            current_time += timedelta(minutes=5)
        
        print(f"  ✓ Added {day_records} records for {current_date.strftime('%Y-%m-%d')}")
        current_date += timedelta(days=1)
        current_date = current_date.replace(hour=6, minute=0, second=0)
    
    print(f"\n✅ Successfully added {total_records} records to Firebase!")
    print(f"   - Devices database: {total_records} records")
    print(f"   - Predicted units database: {total_records} records")
    print(f"\n📊 Data ranges:")
    print(f"   - Temperature: {TEMP_MIN}°C - {TEMP_MAX}°C")
    print(f"   - Rain: 100 (forced)")
    print(f"   - Humidity: {HUMIDITY_MIN}% - {HUMIDITY_MAX}%")
    print(f"   - Lux (bh1750): {LUX_MIN} - {LUX_MAX}")
    print(f"   - Dust: {DUST_MIN} - {DUST_MAX}")
    print(f"   - Predicted kWh (5min): {PREDICTED_KWH_MIN} - {PREDICTED_KWH_MAX} kWh")

if __name__ == "__main__":
    try:
        add_sample_data()
    except Exception as e:
        print(f"❌ Error adding sample data: {e}")
        import traceback
        traceback.print_exc()
