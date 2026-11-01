from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from datetime import datetime, timedelta

from predicted_production import compute_predicted_production

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ✅ Load trained model correctly
model = joblib.load("best_rf_model1.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    """Predict solar system production based on weather data"""
    try:
        data = request.json

        predicted = compute_predicted_production(
            model,
            data["Hour"],
            data["Day"],
            data["Month"],
            data["WindSpeed"],
            data["Sunshine"],
            data["AirPressure"],
            data["Radiation"],
            data["AirTemperature"],
            data["RelativeAirHumidity"],
        )

        return jsonify({
            "success": True,
            "predictedSystemProduction": float(predicted)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route("/detect-fault", methods=["POST"])
def detect_fault():
    """Detect faults by comparing predicted vs actual production"""
    try:
        data = request.json
        
        # Extract features for prediction
        features = np.array([[ 
            data["Hour"],
            data["Day"],
            data["Month"],
            data["WindSpeed"],
            data["Sunshine"],
            data["AirPressure"],
            data["Radiation"],
            data["AirTemperature"],
            data["RelativeAirHumidity"]
        ]])

        # Get predicted production
        predicted_production = float(model.predict(features)[0])
        actual_production = float(data.get("actualProduction", 0))
        
        # Calculate deviation percentage
        if predicted_production > 0:
            deviation = ((actual_production - predicted_production) / predicted_production) * 100
        else:
            deviation = 0
        
        # Determine fault status
        fault_detected = False
        fault_type = "none"
        fault_severity = "none"
        
        # Fault detection logic
        if actual_production < predicted_production * 0.7:  # 30% below prediction
            fault_detected = True
            fault_severity = "high"
            
            # Determine fault type based on conditions
            if data.get("AirTemperature", 0) > 40:
                fault_type = "overheating"
            elif data.get("Radiation", 0) < 50:
                fault_type = "low_radiation"
            elif data.get("Sunshine", 0) < 20:
                fault_type = "low_radiation"
            else:
                fault_type = "low_production"
        elif actual_production < predicted_production * 0.85:  # 15% below prediction
            fault_detected = True
            fault_severity = "medium"
            fault_type = "low_production"
        elif actual_production < predicted_production * 0.95:  # 5% below prediction
            fault_detected = True
            fault_severity = "low"
            fault_type = "low_production"
        
        return jsonify({
            "success": True,
            "prediction": {
                "predictedProduction": predicted_production,
                "actualProduction": actual_production,
                "faultDetected": fault_detected,
                "faultType": fault_type,
                "faultSeverity": fault_severity,
                "deviation": round(deviation, 2)
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route("/forecast", methods=["POST"])
def forecast():
    """Forecast production for next N hours"""
    try:
        data = request.json
        hours_ahead = int(data.get("hoursAhead", 24))
        
        # Get current time
        now = datetime.now()
        
        forecasts = []
        
        for i in range(hours_ahead):
            future_time = now + timedelta(hours=i)

            # Only forecast daytime (06:00 - 18:00). Skip night hours completely.
            if future_time.hour < 6 or future_time.hour >= 18:
                continue
            
            # Use provided weather forecast or estimate
            weather_data = data.get("weatherForecast", [])
            
            if i < len(weather_data):
                weather = weather_data[i]
            else:
                # Improved weather estimation algorithm for realistic daytime solar production
                hour = future_time.hour
                day = future_time.day
                month = future_time.month
                
                # Get current weather values as baseline
                current_wind = data.get("currentWindSpeed", 10)
                current_pressure = data.get("currentAirPressure", 1010)
                current_humidity = data.get("currentHumidity", 60)
                
                # Estimate weather based on time of day (6AM-6PM only, since we skip night)
                # Solar radiation peaks around noon (12:00)
                hours_from_6am = hour - 6
                hours_to_6pm = 18 - hour
                
                # Sunshine: peaks at noon (12:00) with value ~80-100, minimum at 6am/6pm ~20-30
                if hour <= 12:
                    # Morning: increasing sunshine
                    sunshine = max(20, 20 + (hours_from_6am * 10))  # 20 at 6am, 80 at 12pm
                else:
                    # Afternoon: decreasing sunshine
                    sunshine = max(20, 20 + (hours_to_6pm * 10))  # 80 at 12pm, 20 at 6pm
                
                # Radiation: typically 2-3x sunshine, peaks around 200-300 W/m² at noon
                radiation = sunshine * 2.5  # More realistic radiation values
                
                # Temperature: peaks around 2-3 PM, cooler in morning/evening
                if hour <= 14:
                    air_temp = 22 + (hours_from_6am * 1.2)  # 22°C at 6am, ~32°C at 2pm
                else:
                    air_temp = 22 + (hours_to_6pm * 1.2)  # ~32°C at 2pm, 22°C at 6pm
                
                # Ensure realistic bounds
                sunshine = min(100, max(20, sunshine))
                radiation = min(400, max(50, radiation))
                air_temp = min(35, max(20, air_temp))
                
                weather = {
                    "Hour": hour,
                    "Day": day,
                    "Month": month,
                    "WindSpeed": max(5, min(20, current_wind)),  # Reasonable wind: 5-20 m/s
                    "Sunshine": round(sunshine, 1),
                    "AirPressure": max(990, min(1030, current_pressure)),  # Normal range
                    "Radiation": round(radiation, 1),
                    "AirTemperature": round(air_temp, 1),
                    "RelativeAirHumidity": max(30, min(90, current_humidity))  # Reasonable humidity
                }
            
            # Predict production (from predicted_production.py)
            predicted = compute_predicted_production(
                model,
                weather["Hour"],
                weather["Day"],
                weather["Month"],
                weather["WindSpeed"],
                weather["Sunshine"],
                weather["AirPressure"],
                weather["Radiation"],
                weather["AirTemperature"],
                weather["RelativeAirHumidity"],
            )

            forecasts.append({
                "timestamp": future_time.isoformat(),
                "hour": future_time.hour,
                "predictedProduction": predicted,
                "weather": weather
            })

        
        return jsonify({
            "success": True,
            "forecasts": forecasts
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "status": "ML Service is running",
        "model_loaded": model is not None
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
