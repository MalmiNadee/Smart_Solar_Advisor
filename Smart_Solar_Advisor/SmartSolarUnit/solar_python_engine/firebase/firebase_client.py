import firebase_admin
from firebase_admin import credentials, db
import os
from dotenv import load_dotenv

load_dotenv()

cred = credentials.Certificate("firebase_key.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(
        cred,
        {"databaseURL": os.getenv("FIREBASE_DB_URL")}
    )


def get_latest_device_data(device_id: str):
    """
    Reads the most recent record from:
    devices/{device_id}/latest_timestamp
    """
    ref = db.reference(f"devices/{device_id}")
    data = ref.order_by_key().limit_to_last(1).get()

    if not data:
        return None

    return list(data.values())[0]


def save_prediction(customer, site_id, timestamp, payload):
    """
    Saves prediction to:
    predicted_units/{customer}/{site_id}/{timestamp}
    """
    ref = db.reference(
        f"predicted_units/{customer}/{site_id}/{timestamp}"
    )
    ref.set(payload)
