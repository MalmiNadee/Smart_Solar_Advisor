import os
from datetime import datetime
import pandas as pd

def get_days_in_month(year, month):
    """Return number of days in a given month"""
    if month in [1, 3, 5, 7, 8, 10, 12]:
        return 31
    elif month in [4, 6, 9, 11]:
        return 30
    elif month == 2:
        # Check for leap year
        if (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0):
            return 29
        return 28
    return 30

def calculate_optimal_tilt(latitude):
    """Calculate optimal panel tilt using latitude"""
    return min(max(abs(latitude), 0), 60)

def calculate_optimal_azimuth(latitude):
    """Calculate best panel direction based on hemisphere"""
    # Northern hemisphere: face south (180°)
    # Southern hemisphere: face north (0°)
    return 180 if latitude > 0 else 0

def validate_prediction_input(data):
    """Validate required fields and value ranges"""
    required_fields = [
        'latitude', 'longitude', 'year', 'month',
        'ALLSKY_SFC_SW_DWN', 'RH2M', 'T2M', 'WS2M',
        'tilt_deg', 'azimuth_deg', 'installed_capacity_kw',
        'panel_efficiency', 'system_loss', 'shading_factor'
    ]
    
    # Check required fields
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    # Validate value ranges
    validations = [
        (data['latitude'], -90, 90, "Latitude must be between -90 and 90"),
        (data['longitude'], -180, 180, "Longitude must be between -180 and 180"),
        (data['month'], 1, 12, "Month must be between 1 and 12"),
        (data['year'], 2000, 2050, "Year must be between 2000 and 2050"),
        (data['ALLSKY_SFC_SW_DWN'], 0, 15, "Solar irradiance must be between 0 and 15"),
        (data['RH2M'], 0, 100, "Humidity must be between 0 and 100"),
        (data['T2M'], -50, 60, "Temperature must be between -50 and 60"),
        (data['WS2M'], 0, 50, "Wind speed must be between 0 and 50"),
        (data['tilt_deg'], 0, 90, "Tilt angle must be between 0 and 90"),
        (data['azimuth_deg'], 0, 360, "Azimuth angle must be between 0 and 360"),
        (data['installed_capacity_kw'], 0.1, 1000, "Capacity must be between 0.1 and 1000"),
        (data['panel_efficiency'], 0.05, 0.30, "Panel efficiency must be between 0.05 and 0.30"),
        (data['system_loss'], 0, 0.50, "System loss must be between 0 and 0.50"),
        (data['shading_factor'], 0, 1.0, "Shading factor must be between 0 and 1.0"),
    ]
    
    for value, min_val, max_val, error_msg in validations:
        if not (min_val <= value <= max_val):
            return False, error_msg
    
    return True, None

def format_prediction_result(prediction, details=None):
    """Format prediction output for API response"""
    result = {
        'id': prediction.id,
        'predicted_energy_kwh': round(prediction.predicted_energy_kwh, 2),
        'confidence_score': round(prediction.confidence_score, 4),
        'location': {
            'latitude': prediction.latitude,
            'longitude': prediction.longitude
        },
        'period': {
            'year': prediction.year,
            'month': prediction.month,
            'month_name': datetime(2000, prediction.month, 1).strftime('%B')
        },
        'system_config': {
            'tilt_deg': prediction.tilt_deg,
            'azimuth_deg': prediction.azimuth_deg,
            'installed_capacity_kw': prediction.installed_capacity_kw,
            'panel_efficiency': prediction.panel_efficiency,
            'system_loss': prediction.system_loss,
            'shading_factor': prediction.shading_factor
        },
        'created_at': prediction.created_at.isoformat()
    }
    
    if details:
        result['model_breakdown'] = {
            'knn_prediction': round(details.get('knn_prediction', 0), 2),
            'xgb_prediction': round(details.get('xgb_prediction', 0), 2),
        }
    
    return result

def calculate_roi(monthly_energy_kwh, electricity_rate=0.15, system_cost_per_kw=1000):
    """
    Calculate ROI for solar installation
    """
    annual_energy = monthly_energy_kwh * 12
    annual_savings = annual_energy * electricity_rate
    
    return {
        'annual_energy_kwh': round(annual_energy, 2),
        'annual_savings_usd': round(annual_savings, 2),
        'monthly_savings_usd': round(annual_savings / 12, 2),
    }

def load_csv_safely(filepath):
    """
     load CSV file with error handling
    """
    try:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"CSV file not found: {filepath}")
        
        df = pd.read_csv(filepath)
        
        if df.empty:
            raise ValueError("CSV file is empty")
        
        return df
    
    except Exception as e:
        print(f"Error loading CSV: {str(e)}")
        return None

def get_month_name(month_number):
    """Convert month number to month name"""
    months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    if 1 <= month_number <= 12:
        return months[month_number - 1]
    return 'Unknown'

def sanitize_filename(filename):
    """Sanitize filename to prevent security issues"""
    # Remove path components and keep only the filename
    filename = os.path.basename(filename)
    
    # Remove any potentially dangerous characters
    safe_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"
    filename = ''.join(c for c in filename if c in safe_chars)
    
    return filename

def parse_coordinates(coord_string):
    """Parse coordinate string to latitude/longitude"""
    try:
        parts = coord_string.replace(' ', '').split(',')
        if len(parts) != 2:
            return None
        
        lat = float(parts[0])
        lon = float(parts[1])
        
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return None
        
        return lat, lon
    
    except (ValueError, AttributeError):
        return None