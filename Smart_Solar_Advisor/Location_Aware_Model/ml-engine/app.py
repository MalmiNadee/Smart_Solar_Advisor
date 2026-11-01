# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.neighbors import BallTree
from firebase_config import ref

app = Flask(__name__)
CORS(app)

# ====== LOAD DATA ONCE AT STARTUP ======
raw_data = ref.get()

records = []
coordinates = []

for customer in raw_data.values():
    for site in customer.values():
        for timestamp, record in site.items():

            if "latitude" in record and "longitude" in record:
                records.append(record)
                coordinates.append([record["latitude"], record["longitude"]])

# Convert to radians
coordinates = np.radians(coordinates)

# Build BallTree
tree = BallTree(coordinates, metric="haversine")

# =======================================

@app.route("/nearest-location", methods=["POST"])
def find_nearest():

    data = request.json
    new_lat = float(data["latitude"])
    new_lon = float(data["longitude"])

    new_point = np.radians([[new_lat, new_lon]])

    # Get all neighbors sorted by distance
    dist, ind = tree.query(new_point, k=len(records))

    matched_records = []

    for i in ind[0]:
        matched_records.append(records[i])

    return jsonify(matched_records)


@app.route("/aggregate-data", methods=["POST"])
def aggregate_data():

    data = request.json
    new_lat = float(data["latitude"])
    new_lon = float(data["longitude"])
    mode = data["mode"]  # "daily" or "monthly"

    new_point = np.radians([[new_lat, new_lon]])

    dist, ind = tree.query(new_point, k=1)
    nearest_index = ind[0][0]

    nearest_lat = records[nearest_index]["latitude"]
    nearest_lon = records[nearest_index]["longitude"]

    # Filter records for same location
    matched = [
        r for r in records
        if r["latitude"] == nearest_lat and r["longitude"] == nearest_lon
    ]

    if mode == "daily":
        # group by date
        result = {}
        for r in matched:
            date = r["date"]
            result.setdefault(date, []).append(r)

        output = {}

        for date, items in result.items():
            output[date] = calculate_stats(items)

        return jsonify(output)

    elif mode == "monthly":
        result = {}
        for r in matched:
            month = r["date"][:7]  # YYYY-MM
            result.setdefault(month, []).append(r)

        output = {}

        for month, items in result.items():
            output[month] = calculate_stats(items)

        return jsonify(output)

    else:
        return jsonify({"error": "Invalid mode"}), 400


def calculate_stats(items):

    dust = np.mean([r["dust_level"] for r in items])
    humidity = np.mean([r["humidity"] for r in items])
    irradiance = np.mean([r["irradiance"] for r in items])
    rainfall = np.mean([r["rainfall"] for r in items])
    temperature = np.mean([r["temperature"] for r in items])
    total_kwh = np.sum([r["predicted_kwh_per5min"] for r in items])

    return {
        "average_dust_level": float(dust),
        "average_humidity": float(humidity),
        "average_irradiance": float(irradiance),
        "average_rainfall": float(rainfall),
        "average_temperature": float(temperature),
        "total_predicted_kwh_per5min": float(total_kwh)
    }


def build_hourly_profile_for_site(site_records):
    hourly = {h: 0.0 for h in range(24)}

    for record in site_records:
        time_str = str(record.get("time", "00:00"))
        try:
            hour = int(time_str.split(":")[0])
        except (ValueError, IndexError):
            hour = 0

        value = float(record.get("predicted_kwh_per5min", 0.0))
        hourly[hour] += value

    return hourly


@app.route("/battery-backup-estimate", methods=["POST"])
def battery_backup_estimate():
    data = request.json or {}

    latitude = float(data.get("latitude", 0))
    longitude = float(data.get("longitude", 0))
    battery_capacity_kwh = float(data.get("battery_capacity_kwh", 10))
    usable_dod = float(data.get("usable_dod", 0.9))
    efficiency = float(data.get("efficiency", 0.92))
    essential_load_kw = float(data.get("essential_load_kw", 1.0))
    start_hour_local = int(data.get("start_hour_local", 18))
    horizon_hours = int(data.get("horizon_hours", 48))
    system_kw = float(data.get("system_kw", 5))

    if battery_capacity_kwh <= 0 or essential_load_kw <= 0:
        return jsonify({"error": "battery_capacity_kwh and essential_load_kw must be positive."}), 400

    if not (0 < usable_dod <= 1):
        return jsonify({"error": "usable_dod must be between 0 and 1."}), 400

    if not (0 < efficiency <= 1):
        return jsonify({"error": "efficiency must be between 0 and 1."}), 400

    if horizon_hours <= 0:
        return jsonify({"error": "horizon_hours must be > 0."}), 400

    new_point = np.radians([[latitude, longitude]])
    dist, ind = tree.query(new_point, k=1)
    nearest_index = int(ind[0][0])
    nearest_lat = records[nearest_index]["latitude"]
    nearest_lon = records[nearest_index]["longitude"]

    matched = [
        r for r in records
        if r["latitude"] == nearest_lat and r["longitude"] == nearest_lon
    ]

    hourly_profile_base = build_hourly_profile_for_site(matched)
    scale_factor = system_kw / 5.0

    usable_capacity = battery_capacity_kwh * usable_dod
    charge_eff = np.sqrt(efficiency)
    discharge_eff = np.sqrt(efficiency)

    soc_with_solar = usable_capacity
    soc_without_solar = usable_capacity
    timeline = []
    backup_hours = float(horizon_hours)
    without_solar_hours = float(horizon_hours)

    for h in range(horizon_hours):
        hour_of_day = (start_hour_local + h) % 24
        solar_kwh = max(0.0, hourly_profile_base.get(hour_of_day, 0.0) * scale_factor)
        effective_charge = solar_kwh * charge_eff
        required_discharge = essential_load_kw / discharge_eff

        # With solar path
        available_with = soc_with_solar + effective_charge
        if available_with >= required_discharge:
            soc_with_solar = min(usable_capacity, available_with - required_discharge)
        else:
            partial = available_with / required_discharge if required_discharge > 0 else 0
            backup_hours = h + partial
            soc_with_solar = 0.0
            timeline.append({
                "hour": h,
                "hour_of_day": int(hour_of_day),
                "solar_kwh": float(round(solar_kwh, 4)),
                "load_kwh": float(round(essential_load_kw, 4)),
                "soc_kwh": 0.0
            })
            break

        # Without solar path
        if soc_without_solar >= required_discharge:
            soc_without_solar -= required_discharge
        else:
            partial_no_solar = soc_without_solar / required_discharge if required_discharge > 0 else 0
            without_solar_hours = h + partial_no_solar
            soc_without_solar = 0.0

        timeline.append({
            "hour": h,
            "hour_of_day": int(hour_of_day),
            "solar_kwh": float(round(solar_kwh, 4)),
            "load_kwh": float(round(essential_load_kw, 4)),
            "soc_kwh": float(round(soc_with_solar, 4))
        })

    solar_extension = max(0.0, backup_hours - without_solar_hours)

    return jsonify({
        "backup_hours": float(round(backup_hours, 2)),
        "without_solar_hours": float(round(without_solar_hours, 2)),
        "solar_extension_hours": float(round(solar_extension, 2)),
        "nearest_site": {
            "latitude": float(nearest_lat),
            "longitude": float(nearest_lon)
        },
        "timeline": timeline
    })


# ====== LOAD DATA ONCE AT STARTUP ======
raw_data = ref.get()

records = []
coordinates = []
sites_info = [] 

for customer_key, customer in raw_data.items():
    for site_key, site in customer.items():

        first_date = None
        site_lat = None
        site_lon = None

        # sort timestamps to find earliest
        timestamps = sorted(site.keys())

        for idx, timestamp in enumerate(timestamps):
            record = site[timestamp]

            if "latitude" in record and "longitude" in record:
                records.append(record)
                coordinates.append([record["latitude"], record["longitude"]])

                # capture site-level lat/lon from first valid record
                if idx == 0:
                    first_date = record.get("date")
                    site_lat = record.get("latitude")
                    site_lon = record.get("longitude")

        # store site info
        if site_lat is not None:
            sites_info.append({
                "customer": customer_key,
                "site": site_key,
                "latitude": site_lat,
                "longitude": site_lon,
                "first_date": first_date
            })


# Convert to radians
coordinates = np.radians(coordinates)

# Build BallTree
tree = BallTree(coordinates, metric="haversine")

@app.route("/sites-summary", methods=["GET"])
def get_sites_summary():
    return jsonify(sites_info)

if __name__ == "__main__":
    app.run(debug=True, port=5007)