from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import requests
import os
from datetime import datetime
import math
from dotenv import load_dotenv

weather_bp = Blueprint('weather', __name__)

load_dotenv()
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')

# Get real-time or estimated weather data
@weather_bp.route('/data', methods=['GET'])
@jwt_required()
def get_weather_data():
    """Get real-time weather data for a location"""
    try:
        lat_str = request.args.get('lat')
        lon_str = request.args.get('lon')
        
        if not lat_str or not lon_str:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        try:
            lat = float(lat_str)
            lon = float(lon_str)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid coordinate format'}), 400
        
        # Validate coordinate ranges
        if not (-90 <= lat <= 90):
            return jsonify({'error': f'Latitude must be between -90 and 90, got {lat}'}), 400
        
        if not (-180 <= lon <= 180):
            return jsonify({'error': f'Longitude must be between -180 and 180, got {lon}'}), 400
        
        # Get real-time data from OpenWeatherMap
        weather_data = fetch_openweather_data(lat, lon)
        
        if not weather_data:
            # Fallback to estimated values based on location
            weather_data = estimate_weather_data(lat, lon)
        
        return jsonify(weather_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_solar_irradiance(lat, lon, cloud_coverage, month=None):
    """
    Calculate daily solar irradiance (kWh/m²/day)
    """
    # Use current month if not provided
    if month is None:
        month = datetime.utcnow().month
    
    # Average monthly solar irradiance values for Sri Lanka
    MONTHLY_BASELINE = {
        1: 5.0, 2: 5.5, 3: 5.8, 4: 5.8, 5: 5.5, 6: 5.0,
        7: 5.0, 8: 5.2, 9: 5.3, 10: 5.5, 11: 5.2, 12: 4.8
    }
    
    base_irradiance = MONTHLY_BASELINE.get(month, 5.3)
    
    # Reduce irradiance based on cloud coverage
    if cloud_coverage < 20:
        cloud_factor = 0.95
    elif cloud_coverage < 40:
        cloud_factor = 0.85
    elif cloud_coverage < 60:
        cloud_factor = 0.70
    elif cloud_coverage < 80:
        cloud_factor = 0.55
    else:
        cloud_factor = 0.40
    
    solar_irradiance = base_irradiance * cloud_factor
    
    # Ensure realistic bounds for Sri Lanka (3.5-6.5 kWh/m²/day)
    solar_irradiance = max(5.3, min(6.5, solar_irradiance))
    
    return round(solar_irradiance, 2)

def fetch_openweather_data(lat, lon):
    """Fetch real-time weather data from OpenWeatherMap API"""
    try:
        # API key check
        if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY.strip() == '':
            print("OpenWeatherMap API key not configured")
            return None
        
        url = f"https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract weather data
            main_data = data.get('main', {})
            temp = main_data.get('temp', 27.0)
            humidity = main_data.get('humidity', 75.0)
            pressure = main_data.get('pressure', 1013.0)
            
            wind_data = data.get('wind', {})
            wind_speed = wind_data.get('speed', 3.5)
            
            clouds_data = data.get('clouds', {})
            cloud_coverage = clouds_data.get('all', 30.0)
            
            # Get current month for calculation
            current_month = datetime.utcnow().month
            
            # Calculate solar irradiance based on clouds and season
            solar_irradiance = calculate_solar_irradiance(lat, lon, cloud_coverage, current_month)
            
            # Location name
            location_name = data.get('name', 'Unknown')
            country = data.get('sys', {}).get('country', '')
            if country:
                location_name = f"{location_name}, {country}"
            
            # Ensure realistic values for Sri Lanka
            temp = max(18.0, min(38.0, temp))
            humidity = max(50.0, min(98.0, humidity))
            wind_speed = max(0.0, min(20.0, wind_speed))
            
            return {
                'location': location_name,
                'temperature': round(temp, 1),
                'humidity': round(humidity, 1),
                'wind_speed': round(wind_speed, 1),
                'solar_irradiance': solar_irradiance,
                'cloud_coverage': round(cloud_coverage, 1),
                'pressure': round(pressure, 1),
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'OpenWeatherMap'
            }
        elif response.status_code == 401:
            print(f"OpenWeatherMap API authentication failed - Invalid API key")
            return None
        elif response.status_code == 429:
            print(f"OpenWeatherMap API rate limit exceeded")
            return None
        else:
            print(f"OpenWeatherMap API error: {response.status_code}")
            return None
    
    except Exception as e:
        print(f"Error fetching OpenWeatherMap data: {e}")
        return None

def estimate_weather_data(lat, lon):
    """Estimate weather data based on location (fallback)"""
    sri_lanka_cities = [
        ('Colombo', (6.8, 7.0), (79.7, 79.9), 29.0, 78.0, 5.3),
        ('Malabe', (6.88, 6.92), (79.94, 79.98), 28.5, 77.0, 5.4),
        ('Kandy', (7.2, 7.3), (80.6, 80.7), 26.0, 80.0, 5.2),
        ('Galle', (6.0, 6.1), (80.2, 80.3), 29.0, 80.0, 5.4),
        ('Jaffna', (9.6, 9.7), (80.0, 80.1), 29.0, 75.0, 5.5),
    ]
    
    # Check if location matches any known city
    matched_city = None
    for city_name, lat_range, lon_range, temp, hum, solar in sri_lanka_cities:
        if lat_range[0] <= lat <= lat_range[1] and lon_range[0] <= lon <= lon_range[1]:
            matched_city = (city_name, temp, hum, solar)
            break
    
    if matched_city:
        city_name, base_temp, humidity, solar_irradiance = matched_city
        location_name = f"{city_name}, Sri Lanka"
    else:
        # Generic estimation for Sri Lanka
        if 5.5 <= lat <= 10.0 and 79.0 <= lon <= 82.0:
            base_temp = 28.0
            humidity = 76.0
            solar_irradiance = 5.3
            location_name = f"Sri Lanka ({lat:.2f}°, {lon:.2f}°)"
        else:
            # Outside Sri Lanka - generic tropical
            base_temp = 27.0
            humidity = 75.0
            solar_irradiance = 5.0
            location_name = f"Location ({lat:.2f}°, {lon:.2f}°)"
    
    # Add seasonal variation
    month = datetime.utcnow().month
    if month in [12, 1, 2]:  # Cooler months
        base_temp -= 2
    elif month in [3, 4, 5]:  # Hot season
        base_temp += 2
    
    return {
        'location': location_name,
        'temperature': round(base_temp, 1),
        'humidity': round(humidity, 1),
        'wind_speed': 3.5,
        'solar_irradiance': solar_irradiance,
        'cloud_coverage': 40.0,
        'pressure': 1013.0,
        'timestamp': datetime.utcnow().isoformat(),
        'source': 'Estimated'
    }