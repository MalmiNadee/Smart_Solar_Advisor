# Weather API Configuration – Seasonal Trend Forecasting

This document describes how to configure the Weather API integration for **seasonal trend forecasting** in Smart Solar Advisor (Backend and Web App). The integration uses weather data to improve long-term energy predictions and to display seasonality (e.g. January vs August) on the dashboard.

---

## 1. API Selection

| API | Use Case | API Key | Historical | Forecast | Notes |
|-----|----------|---------|------------|----------|--------|
| **Open-Meteo** (default) | Free, no key | Not required | Yes (archive) | Yes | Recommended for development and production. |
| OpenWeatherMap | Alternative | Required | Paid tier | Yes | Use if you already have a key. |
| Weatherstack | Alternative | Required | Paid tier | Yes | Good for current + historical. |
| Climacell / Tomorrow.io | Alternative | Required | Yes | Yes | Commercial focus. |

**Current implementation:** The backend uses **Open-Meteo** by default (no API key). You can add optional support for OpenWeatherMap via environment variables (see below).

---

## 2. Backend Configuration

### 2.1 Environment Variables

Create or update `.env` in `SmartSolar_Backend`:

```env
# Optional: use OpenWeatherMap instead of Open-Meteo (leave empty to use Open-Meteo)
WEATHER_API_PROVIDER=open-meteo
# WEATHER_API_PROVIDER=openweathermap

# Required only if WEATHER_API_PROVIDER=openweathermap
# OPENWEATHERMAP_API_KEY=your_api_key_here

# Default location when site has no coordinates (latitude, longitude)
# Used for seasonal trends if no site is selected or site has no lat/lon
DEFAULT_WEATHER_LAT=6.9271
DEFAULT_WEATHER_LON=79.8612
```

- **Open-Meteo**: No key needed. Set `WEATHER_API_PROVIDER=open-meteo` or leave it unset.
- **OpenWeatherMap**: Sign up at [OpenWeatherMap](https://openweathermap.org/api), create an API key, set `WEATHER_API_PROVIDER=openweathermap` and `OPENWEATHERMAP_API_KEY=your_key`.

### 2.2 Site-Level Configuration (Optional)

For per-site weather (e.g. different cities or regions), store **latitude** and **longitude** on each site. The backend and web app use these when available; otherwise they fall back to the default coordinates above.

**Firestore `solar_sites` document fields (optional):**

| Field | Type | Description |
|-------|------|-------------|
| `latitude` | number | Site latitude (e.g. 6.9271). |
| `longitude` | number | Site longitude (e.g. 79.8612). |
| `city` | string | Display name (e.g. "Colombo"). Optional. |

Example site document (with weather-related fields):

```json
{
  "id": "site_001",
  "site_name": "Green Energy Farm - Main",
  "customer_name": "dilshan_home",
  "device_id": "SSA_ESP32_01",
  "latitude": 6.9271,
  "longitude": 79.8612,
  "city": "Colombo",
  "system_kw": 50,
  "status": "running",
  "created_at": "2024-01-15"
}
```

You can add these fields when creating/editing a site in the Web App (if the form is extended) or via seed scripts / Firestore console.

---

## 3. API Endpoints (Backend)

All weather routes are under `/api/weather`. Authentication uses the same `Authorization: Bearer <token>` as the rest of the API.

| Method | Endpoint | Query Params | Description |
|--------|----------|--------------|-------------|
| GET | `/api/weather/current` | `lat`, `lon` | Current weather (temperature, humidity, etc.). |
| GET | `/api/weather/forecast` | `lat`, `lon` | Multi-day forecast (e.g. 7 days). |
| GET | `/api/weather/seasonal` | `lat`, `lon` | Last 12 months aggregated by month (temperature, precipitation) for seasonal trends. |

If `lat` or `lon` are omitted, the server uses `DEFAULT_WEATHER_LAT` and `DEFAULT_WEATHER_LON` from `.env`.

---

## 4. Data Usage in the Application

- **Forecast model parameters:** Weather data (temperature, precipitation, humidity) from the APIs can be used to adjust forecast model parameters in the Python ML engine or in backend logic (e.g. seasonal correction factors).
- **Historical trends:** The **seasonal** endpoint returns monthly aggregates (e.g. mean temp, total precipitation) for the last 12 months. Use this to:
  - Fine-tune the ML model with regional/monthly trends.
  - Display “monthly temperature vs predicted solar yield” on the dashboard.
- **Visualization:** The Web App dashboard includes a **Seasonal Trends** section with:
  - Monthly average temperature (from weather API).
  - Predicted solar yield per month (from your existing prediction data).

---

## 5. Web App Configuration

- **API base URL:** The Web App calls the backend at `VITE_API_BASE_URL` (e.g. `http://localhost:5001/api`). No extra env vars are required for the weather endpoints; they use the same base URL and auth token.
- **Site coordinates:** When a site has `latitude` and `longitude`, the dashboard uses them for the seasonal/forecast widgets. Otherwise it uses the backend default coordinates.

---

## 6. Optional: Using OpenWeatherMap Instead of Open-Meteo

1. Get an API key from [OpenWeatherMap](https://openweathermap.org/api).
2. In `.env`:
   - `WEATHER_API_PROVIDER=openweathermap`
   - `OPENWEATHERMAP_API_KEY=your_key`
3. The backend service layer can be extended to call OpenWeatherMap’s current and forecast (and historical if you have a paid plan) when `WEATHER_API_PROVIDER=openweathermap`. The rest of this doc and the current code assume Open-Meteo as the default implementation.

---

## 7. Summary Checklist

- [ ] Backend `.env`: optional `WEATHER_API_PROVIDER`, `DEFAULT_WEATHER_LAT`, `DEFAULT_WEATHER_LON`; if using OpenWeatherMap, set `OPENWEATHERMAP_API_KEY`.
- [ ] Sites (optional): add `latitude`, `longitude`, and optionally `city` for site-specific weather.
- [ ] Backend running: weather routes available under `/api/weather/*`.
- [ ] Web App: dashboard shows “Seasonal Trends” with monthly temperature and predicted solar yield.
