"""
Carbon Footprint Calculator for Solar Energy Systems
Calculates CO2 emissions avoided by using solar energy
"""

# Average CO2 emission factor for Sri Lanka grid electricity (kg CO2/kWh)
SRI_LANKA_GRID_CO2_FACTOR = 0.65

# Average CO2 emission factor for global grid (kg CO2/kWh)
GLOBAL_GRID_CO2_FACTOR = 0.5

def calculate_carbon_savings(energy_kwh, country='LK'):
    """
     Calculate CO2 emissions avoided by solar energy generation
    """
    # Select appropriate CO2 factor based on country
    if country == 'LK':
        co2_factor = SRI_LANKA_GRID_CO2_FACTOR
    else:
        co2_factor = GLOBAL_GRID_CO2_FACTOR
    
    # Calculate CO2 avoided
    co2_avoided_kg = energy_kwh * co2_factor
    co2_avoided_tonnes = co2_avoided_kg / 1000
    
    # Convert CO2 savings into equivalent number of trees
    trees_equivalent = co2_avoided_kg / 21 if co2_avoided_kg > 0 else 0
    
     # Convert CO2 savings into equivalent number of cars removed
    cars_equivalent = co2_avoided_tonnes / 4.6 if co2_avoided_tonnes > 0 else 0
    
    return {
        'co2_avoided_kg': round(co2_avoided_kg, 2),
        'co2_avoided_tonnes': round(co2_avoided_tonnes, 3),
        'trees_equivalent': round(trees_equivalent, 1),
        'cars_equivalent': round(cars_equivalent, 2),
        'co2_factor_used': co2_factor
    }

def calculate_lifetime_carbon_savings(annual_energy_kwh, system_lifetime_years=25):
    """
    Calculate total CO2 savings over the system lifetime
    """
    
    # Total energy produced during system lifetime
    lifetime_energy = annual_energy_kwh * system_lifetime_years
    savings = calculate_carbon_savings(lifetime_energy)
    
    savings['lifetime_energy_kwh'] = lifetime_energy
    savings['system_lifetime_years'] = system_lifetime_years
    
    return savings

