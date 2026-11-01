from firebase_admin import db
from utils.sensor_mapper import map_firebase_to_model_features
from services.prediction_service import calculate_5min_system_energy
from utils.time_utils import firebase_safe_timestamp
from firebase.firebase_client import save_prediction

def start_device_listener(site_config):
    """
    Listens to new sensor entries for a device
    """

    device_id = site_config["device_id"]
    customer = site_config["customer"]
    site_id = site_config["site_id"]
    panel_area = site_config["panel_area_m2"]

    ref = db.reference(f"devices/{device_id}")

    def on_event(event):
        # Trigger only when new child is added
        if event.event_type != "put":
            return

        # Ignore initial full dump
        if not isinstance(event.data, dict):
            return

        try:
            raw_data = event.data

            model_features = map_firebase_to_model_features(raw_data)

            energy_5min = calculate_5min_system_energy(
                model_features,
                panel_area
            )

            timestamp = firebase_safe_timestamp()

            save_prediction(
                customer,
                site_id,
                timestamp,
                {
                    "predicted_kwh_5min": energy_5min,
                    "features_used": model_features,
                    "device_id": device_id,
                    "unit": "kWh",
                    "interval": "5_min"
                }
            )

            print(
                f"[AUTO] {device_id} → {energy_5min} kWh saved"
            )

        except Exception as e:
            print(f"Prediction error: {e}")

    ref.listen(on_event)
