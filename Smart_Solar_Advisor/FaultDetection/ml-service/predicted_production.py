"""
Predicted Production module.
Computes solar production prediction using the ML model with a physics-based fallback
when the model returns zero or fails.
"""
import numpy as np


def compute_predicted_production(
    model,
    hour: float,
    day: float,
    month: float,
    wind_speed: float,
    sunshine: float,
    air_pressure: float,
    radiation: float,
    air_temperature: float,
    humidity: float,
) -> float:
    """
    Compute predicted solar production (Watts).

    Uses the trained model first. If the model returns <= 0 or raises an error,
    falls back to a physics-inspired heuristic based on radiation and sunshine.

    Args:
        model: Loaded sklearn model (e.g., RandomForest)
        hour, day, month: Time features
        wind_speed, sunshine, air_pressure, radiation, air_temperature, humidity: Weather features

    Returns:
        Predicted production in Watts (non-negative).
    """
    pred = 0.0

    try:
        features = np.array([[
            float(hour),
            float(day),
            float(month),
            float(wind_speed),
            float(sunshine),
            float(air_pressure),
            float(radiation),
            float(air_temperature),
            float(humidity),
        ]])
        pred = float(model.predict(features)[0])
    except Exception:
        pred = 0.0

    if pred > 0:
        return round(pred, 2)

    # Fallback: physics-inspired heuristic
    rad = max(0.0, float(radiation))
    sun = max(0.0, float(sunshine))
    temp = float(air_temperature)

    rad_capped = min(rad, 400.0)
    scale = 10.0
    base_production = rad_capped * scale

    sun_factor = min(sun / 50.0, 2.0) if sun > 0 else 0.5
    temp_factor = 0.85 if temp > 35 else (0.9 if temp > 30 else 1.0)

    heuristic = base_production * sun_factor * temp_factor
    return round(max(0.0, heuristic), 2)
