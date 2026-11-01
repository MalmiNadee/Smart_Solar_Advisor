import calendar
from datetime import datetime

# Average daily solar irradiance in kWh/m²/day for Sri Lanka by month
SRILANKA_SOLAR_IRRADIANCE = {
    1: 5.0, 2: 5.5, 3: 5.8, 4: 5.8, 5: 5.5, 6: 5.0,
    7: 5.0, 8: 5.2, 9: 5.3, 10: 5.5, 11: 5.2, 12: 4.8
}

def compute_shading(rh):
    """Compute shading factor based on relative humidity"""
    # High humidity - more clouds
    shading = 1 - (rh - 60) / 250
    return max(0.85, min(1.0, shading))

def _sanitize_inputs(input_data):
    """Normalize and validate inputs"""
    month = int(input_data.get('month') or datetime.now().month)
    month = max(1, min(12, month))
    year = int(input_data.get('year') or datetime.now().year)
    year = max(2000, min(2100, year))

    # Days in selected month
    days_in_month = calendar.monthrange(year, month)[1]

    # Solar irradiance priority
    solar_irradiance = input_data.get('solar_irradiance')
    if solar_irradiance is None:
        solar_irradiance = input_data.get('allsky_sfc_sw_dwn')
    if solar_irradiance is None:
        solar_irradiance = SRILANKA_SOLAR_IRRADIANCE[month]
    solar_irradiance = float(solar_irradiance)
    
    # Ensure realistic bounds for Sri Lanka
    solar_irradiance = max(3.5, min(6.5, solar_irradiance))

    # Relative Humidity
    rh = float(input_data.get('rh') or input_data.get('rh2m') or 75.0)
    rh = max(40.0, min(100.0, rh))
    
    # Solar system capacity (kW)
    installed_capacity_kw = float(input_data.get('installed_capacity_kw') or 5.0)
    installed_capacity_kw = max(0.1, min(1000.0, installed_capacity_kw))
    
    panel_efficiency = float(input_data.get('panel_efficiency') or 0.18)
    panel_efficiency = max(0.10, min(0.25, panel_efficiency))
    
    system_loss = float(input_data.get('system_loss') or 0.14)
    system_loss = max(0.05, min(0.30, system_loss))
    
    shading_factor = input_data.get('shading_factor')
    if shading_factor is None:
        shading_factor = compute_shading(rh)
    shading_factor = max(0.50, min(1.0, float(shading_factor)))

    return {
        'solar_irradiance': solar_irradiance,
        'rh': rh,
        'installed_capacity_kw': installed_capacity_kw,
        'panel_efficiency': panel_efficiency,
        'system_loss': system_loss,
        'shading_factor': shading_factor,
        'year': year,
        'month': month,
        'days_in_month': days_in_month
    }

def calculate_daily_energy_physics(input_data, return_context=False):
    """
    Calculate daily energy production (kWh) of the solar system.
    """
    params = _sanitize_inputs(input_data)
    
    # Daily energy calculation
    daily_energy = (
        params['installed_capacity_kw']
        * params['solar_irradiance']
        * (1 - params['system_loss'])
        * params['shading_factor']
    )
    
    daily_energy = round(max(0, daily_energy), 2)
    
    if return_context:
        params['daily_energy_kwh'] = daily_energy
        return daily_energy, params
    return daily_energy

def calculate_monthly_energy_physics(input_data, return_context=False):
    """Calculate monthly energy by multiplying daily energy by days in month"""
    daily_energy, params = calculate_daily_energy_physics(input_data, return_context=True)
    monthly_energy = round(daily_energy * params['days_in_month'], 2)
    
    if return_context:
        params['monthly_energy_kwh'] = monthly_energy
        params['daily_energy_kwh'] = daily_energy
        return monthly_energy, params
    return monthly_energy