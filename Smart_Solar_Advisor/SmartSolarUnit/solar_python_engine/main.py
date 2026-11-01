"""
Smart Solar Advisor
Realtime ML Prediction Engine (Firebase Listener Safe)
"""

from firebase_admin import db
from firebase.firebase_client import save_prediction
from utils.sensor_mapper import map_firebase_to_model_features
from services.prediction_service import calculate_5min_system_energy
from utils.time_utils import firebase_safe_timestamp

# --------------------------------------------------
# DEVICE / SITE CONFIGURATION
# --------------------------------------------------

SITES = [
    {
        "device_id": "SSA_ESP32_01",
        "site_id": "site_001",
        "customer": "dilshan",
        "panel_area_m2": 25
    }
]

# --------------------------------------------------
# LISTENER LOGIC
# --------------------------------------------------

def start_device_listener(site_config: dict):
    device_id = site_config["device_id"]
    site_id = site_config["site_id"]
    customer = site_config["customer"]
    panel_area = site_config["panel_area_m2"]

    ref = db.reference(f"devices/{device_id}")

    print(f"Listening to device: {device_id}")

    def on_event(event):
        """
        Firebase Realtime Database event handler
        """

        # Ignore initial full snapshot
        if event.path == "/":
            return

        # Ignore deletes
        if event.data is None:
            return

        # event.data is now ONE sensor record
        raw_sensor_data = event.data

        try:
            # Map raw sensor payload → ML features
            model_features = map_firebase_to_model_features(raw_sensor_data)

            # Predict system energy for 5 minutes
            predicted_energy = calculate_5min_system_energy(
                model_features,
                panel_area
            )

            timestamp_key = firebase_safe_timestamp()

            # Save prediction
            save_prediction(
                customer,
                site_id,
                timestamp_key,
                {
                    "predicted_kwh_5min": predicted_energy,
                    "device_id": device_id,
                    "panel_area_m2": panel_area,
                    "features_used": model_features,
                    "interval": "5_min",
                    "unit": "kWh"
                }
            )

            print(
                f"[AUTO] {device_id} → "
                f"{predicted_energy} kWh saved"
            )

        except KeyError as e:
            print(f"[SKIP] Missing sensor field: {e}")

        except Exception as e:
            print(f"[ERROR] Prediction failed: {e}")

    # Start realtime listener (blocking)
    ref.listen(on_event)


# --------------------------------------------------
# ENTRY POINT
# --------------------------------------------------

if __name__ == "__main__":
    print("Smart Solar Advisor – Realtime Prediction Engine Started")

    for site in SITES:
        start_device_listener(site)
