def map_firebase_to_model_features(raw: dict) -> dict:
    """
    Converts raw Firebase sensor payload into ML model features
    """

    irradiance = raw["bh1750"]["lux_avg"]

    temperature = raw["dht_avg"]["temp_c"]
    humidity = raw["dht_avg"]["hum_%"]

    rainfall = (
        raw["rain"]["pct1"] + raw["rain"]["pct2"]
    ) / 2

    dust_level = raw["dust"]["mg_m3"]

    return {
        "irradiance": irradiance,
        "temperature": temperature,
        "humidity": humidity,
        "rainfall": rainfall,
        "dust_level": dust_level
    }
