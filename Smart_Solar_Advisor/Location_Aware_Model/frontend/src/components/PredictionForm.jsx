import React, { useState, useEffect, useRef } from "react";
import { predictionsAPI, weatherAPI } from "../services/api";
import LocationMap from "./LocationMap";
import "../styles/PredictionForm.css";

function PredictionForm({ onPredictionComplete }) {
  const [formData, setFormData] = useState({
    latitude: 6.9,
    longitude: 79.95,
    solar_irradiance: 5.3,
    allsky_sfc_sw_dwn: 5.3,
    rh2m: 75.0,
    t2m: 26.0,
    ws2m: 6.0,
    tilt_deg: 8.0,
    azimuth_deg: 180.0,
    installed_capacity_kw: 5.0,
    panel_efficiency: 0.18,
    system_loss: 0.14,
    shading_factor: 0.96,
    electricity_rate: 35.0,
    system_cost_per_kw: 220000,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [predictionType, setPredictionType] = useState("monthly");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const hasMounted = useRef(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = parseFloat(value);

    // Update both keys for solar irradiance
    if (name === "solar_irradiance" || name === "allsky_sfc_sw_dwn") {
      setFormData((prev) => ({
        ...prev,
        solar_irradiance: parsedValue,
        allsky_sfc_sw_dwn: parsedValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: parsedValue || value,
      }));
    }
  };

  const fetchWeatherData = async (lat, lon) => {
    if (lat === null || lat === undefined || lon === null || lon === undefined)
      return;
    if (isNaN(lat) || isNaN(lon)) return;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

    setLoadingWeather(true);
    try {
      const response = await weatherAPI.getWeatherData(lat, lon);
      const weather = response.data;

      console.log("Weather data received:", weather);

      // Update form with weather data
      setFormData((prev) => {
        const solarIrr =
          weather.solar_irradiance != null && !isNaN(weather.solar_irradiance)
            ? parseFloat(weather.solar_irradiance)
            : 5.3;

        const humidityVal =
          weather.humidity != null && !isNaN(weather.humidity)
            ? parseFloat(weather.humidity)
            : 75.0;

        const tempVal =
          weather.temperature != null && !isNaN(weather.temperature)
            ? parseFloat(weather.temperature)
            : 27.5;

        const windVal =
          weather.wind_speed != null && !isNaN(weather.wind_speed)
            ? parseFloat(weather.wind_speed)
            : 3.5;

        return {
          ...prev,
          // Update both keys for compatibility
          solar_irradiance: solarIrr,
          allsky_sfc_sw_dwn: solarIrr,
          rh2m: humidityVal,
          rh: humidityVal,
          t2m: tempVal,
          ws2m: windVal,
        };
      });

      setWeatherData(weather);
    } catch (err) {
      console.error("Failed to fetch weather data:", err);
      setError("Failed to fetch weather data. Using default values.");
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleLocationChange = (lat, lon) => {
    if (isNaN(lat) || isNaN(lon)) {
      console.error("Invalid coordinates: NaN values", lat, lon);
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.error("Invalid coordinates: out of range", lat, lon);
      return;
    }

    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;

    setFormData((prev) => ({
      ...prev,
      latitude: roundedLat,
      longitude: roundedLon,
    }));

    fetchWeatherData(roundedLat, roundedLon);
  };

  useEffect(() => {
    // Auto-calculate optimal tilt based on latitude
    if (formData.latitude && formData.tilt_deg === 8.0) {
      const optimalTilt = Math.min(
        Math.max(Math.abs(formData.latitude), 5),
        15
      );
      setFormData((prev) => ({
        ...prev,
        tilt_deg: optimalTilt,
      }));
    }
  }, [formData.latitude, formData.tilt_deg]);

  useEffect(() => {
    if (!hasMounted.current && formData.latitude && formData.longitude) {
      hasMounted.current = true;
      fetchWeatherData(formData.latitude, formData.longitude);
    }
  }, [formData.latitude, formData.longitude]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let response;
      // Ensure both solar irradiance keys are present
      const submitData = {
        ...formData,
        solar_irradiance:
          formData.solar_irradiance || formData.allsky_sfc_sw_dwn,
        allsky_sfc_sw_dwn:
          formData.solar_irradiance || formData.allsky_sfc_sw_dwn,
      };

      if (predictionType === "annual") {
        response = await predictionsAPI.predictAnnual(submitData);
      } else if (predictionType === "daily") {
        response = await predictionsAPI.predictDaily(submitData);
      } else {
        response = await predictionsAPI.predict(submitData);
      }
      onPredictionComplete(response.data, predictionType);
    } catch (err) {
      setError(
        err.response?.data?.error || "Prediction failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Preset locations for Sri Lanka
  const sriLankaPresets = [
    { name: "Colombo", lat: 6.9271, lon: 79.8612 },
    { name: "Malabe", lat: 6.9, lon: 79.95 },
    { name: "Kandy", lat: 7.2906, lon: 80.6337 },
    { name: "Galle", lat: 6.0535, lon: 80.221 },
    { name: "Jaffna", lat: 9.6615, lon: 80.0255 },
  ];

  return (
    <div className="prediction-form-container">
      <h2> Solar Energy Prediction - Sri Lanka</h2>

      <div className="prediction-type-selector">
        <button
          className={predictionType === "monthly" ? "active" : ""}
          onClick={() => setPredictionType("monthly")}
        >
          Monthly Prediction
        </button>
        <button
          className={predictionType === "daily" ? "active" : ""}
          onClick={() => setPredictionType("daily")}
        >
          Daily Prediction
        </button>
        <button
          className={predictionType === "annual" ? "active" : ""}
          onClick={() => setPredictionType("annual")}
        >
          Annual Prediction
        </button>
      </div>

      <form onSubmit={handleSubmit} className="prediction-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <div className="section-header">
            <h3> Location Details</h3>
            <button
              type="button"
              className="toggle-map-btn"
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? "Hide Map" : " Show Map"}
            </button>
          </div>

          <div className="location-presets">
            <label style={{ fontSize: "0.9em", color: "#666" }}>
              Quick Select:
            </label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "8px",
              }}
            >
              {sriLankaPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className="preset-btn"
                  onClick={() => handleLocationChange(preset.lat, preset.lon)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.85em",
                    background: "#f0f0f0",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {showMap && (
            <div className="map-section">
              <LocationMap
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationChange={handleLocationChange}
                height="350px"
              />
            </div>
          )}

          <div className="form-grid" style={{ marginTop: "16px" }}>
            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                value={formData.latitude?.toFixed(4) || ""}
                readOnly
                style={{ background: "#f5f5f5" }}
              />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                value={formData.longitude?.toFixed(4) || ""}
                readOnly
                style={{ background: "#f5f5f5" }}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Climate Data</h3>
            {loadingWeather && (
              <span className="loading-badge">Loading weather...</span>
            )}
            {weatherData && (
              <button
                type="button"
                className="refresh-weather-btn"
                onClick={() =>
                  fetchWeatherData(formData.latitude, formData.longitude)
                }
                title="Refresh weather data"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Solar Irradiance (kWh/m²/day)</label>
              <input
                type="number"
                name="solar_irradiance"
                value={formData.solar_irradiance}
                onChange={handleChange}
                step="0.1"
                min="3.0"
                max="7.0"
                required
              />
            </div>
            <div className="form-group">
              <label>Relative Humidity (%)</label>
              <input
                type="number"
                name="rh2m"
                value={formData.rh2m}
                onChange={handleChange}
                step="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label>Temperature (°C)</label>
              <input
                type="number"
                name="t2m"
                value={formData.t2m}
                onChange={handleChange}
                step="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label>Wind Speed (m/s)</label>
              <input
                type="number"
                name="ws2m"
                value={formData.ws2m}
                onChange={handleChange}
                step="0.1"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3> System Configuration</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Tilt Angle (degrees)</label>
              <input
                type="number"
                name="tilt_deg"
                value={formData.tilt_deg}
                onChange={handleChange}
                step="0.1"
                min="0"
                max="90"
                required
              />
            </div>
            <div className="form-group">
              <label>Azimuth Angle (degrees)</label>
              <input
                type="number"
                name="azimuth_deg"
                value={formData.azimuth_deg}
                onChange={handleChange}
                step="0.1"
                min="0"
                max="360"
                required
              />
              <small>180° = South (optimal)</small>
            </div>
            <div className="form-group">
              <label>Installed Capacity (kW)</label>
              <input
                type="number"
                name="installed_capacity_kw"
                value={formData.installed_capacity_kw}
                onChange={handleChange}
                step="0.1"
                min="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label>Panel Efficiency (0-1)</label>
              <input
                type="number"
                name="panel_efficiency"
                value={formData.panel_efficiency}
                onChange={handleChange}
                step="0.01"
                min="0.10"
                max="0.25"
                required
              />
            </div>
            <div className="form-group">
              <label>System Loss (0-1)</label>
              <input
                type="number"
                name="system_loss"
                value={formData.system_loss}
                onChange={handleChange}
                step="0.01"
                min="0.05"
                max="0.30"
                required
              />
            </div>
            <div className="form-group">
              <label>Shading Factor (0-1)</label>
              <input
                type="number"
                name="shading_factor"
                value={formData.shading_factor}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="1"
                required
              />
              <small>1.0 = No shading</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Financial Parameters</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Electricity Rate (LKR/kWh)</label>
              <input
                type="number"
                name="electricity_rate"
                value={formData.electricity_rate}
                onChange={handleChange}
                step="1"
                min="0"
                placeholder="35.0"
              />
            </div>
            <div className="form-group">
              <label>System Cost per kW (LKR)</label>
              <input
                type="number"
                name="system_cost_per_kw"
                value={formData.system_cost_per_kw}
                onChange={handleChange}
                step="1000"
                min="0"
                placeholder="220000"
              />
            </div>
          </div>
        </div>

        <button type="submit" className="predict-button" disabled={loading}>
          {loading ? "Predicting..." : "Generate Prediction"}
        </button>
      </form>
    </div>
  );
}

export default PredictionForm;
