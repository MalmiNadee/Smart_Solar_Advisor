/**
 * Weather service – Open-Meteo (default, no API key).
 * Fetches current, forecast, and historical data for seasonal trend forecasting.
 */

const DEFAULT_LAT = parseFloat(process.env.DEFAULT_WEATHER_LAT || '6.9271');
const DEFAULT_LON = parseFloat(process.env.DEFAULT_WEATHER_LON || '79.8612');

const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';

function getCoords(lat, lon) {
  const latitude = lat != null && lat !== '' ? parseFloat(lat) : DEFAULT_LAT;
  const longitude = lon != null && lon !== '' ? parseFloat(lon) : DEFAULT_LON;
  return { latitude, longitude };
}

/**
 * Fetch current weather (today's conditions from forecast).
 */
export async function getCurrentWeather(lat, lon) {
  const { latitude, longitude } = getCoords(lat, lon);
  const params = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover',
    timezone: 'auto',
  });
  const url = `${OPEN_METEO_FORECAST}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();
  return {
    temperature: data.current?.temperature_2m ?? null,
    humidity: data.current?.relative_humidity_2m ?? null,
    precipitation: data.current?.precipitation ?? null,
    weather_code: data.current?.weather_code ?? null,
    cloud_cover: data.current?.cloud_cover ?? null,
    time: data.current?.time ?? new Date().toISOString(),
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
  };
}

/**
 * Fetch multi-day forecast (daily max/min temp and precipitation).
 */
export async function getForecast(lat, lon, days = 7) {
  const { latitude, longitude } = getCoords(lat, lon);
  const params = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
    timezone: 'auto',
    forecast_days: Math.min(Math.max(1, days), 16),
  });
  const url = `${OPEN_METEO_FORECAST}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();
  const daily = data.daily || {};
  const len = (daily.time || []).length;
  const forecast = [];
  for (let i = 0; i < len; i++) {
    forecast.push({
      date: daily.time[i],
      temperature_2m_max: daily.temperature_2m_max?.[i] ?? null,
      temperature_2m_min: daily.temperature_2m_min?.[i] ?? null,
      precipitation_sum: daily.precipitation_sum?.[i] ?? null,
      weather_code: daily.weather_code?.[i] ?? null,
    });
  }
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    daily: forecast,
  };
}

/**
 * Fetch last 12 months of daily weather and aggregate by month for seasonal trends.
 * Uses Open-Meteo Archive API.
 */
export async function getSeasonalTrends(lat, lon) {
  const { latitude, longitude } = getCoords(lat, lon);
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,
    start_date: startDate,
    end_date: endDate,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
  });
  const url = `${OPEN_METEO_ARCHIVE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Weather archive API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const daily = data.daily || {};
  const times = daily.time || [];
  const maxT = daily.temperature_2m_max || [];
  const minT = daily.temperature_2m_min || [];
  const precip = daily.precipitation_sum || [];

  // Aggregate by month (YYYY-MM)
  const byMonth = new Map();
  for (let i = 0; i < times.length; i++) {
    const dateStr = times[i];
    const monthKey = dateStr.slice(0, 7);
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, { temps: [], precipitation: 0 });
    }
    const rec = byMonth.get(monthKey);
    if (maxT[i] != null) rec.temps.push(maxT[i]);
    if (minT[i] != null) rec.temps.push(minT[i]);
    if (precip[i] != null) rec.precipitation += Number(precip[i]);
  }

  const monthly = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (const [yearMonth, rec] of [...byMonth.entries()].sort()) {
    const avgTemp = rec.temps.length
      ? rec.temps.reduce((a, b) => a + b, 0) / rec.temps.length
      : null;
    const [y, m] = yearMonth.split('-').map(Number);
    monthly.push({
      yearMonth,
      monthName: monthNames[m - 1],
      year: y,
      month: m,
      avgTemperature: avgTemp != null ? Math.round(avgTemp * 10) / 10 : null,
      precipitationSum: Math.round(rec.precipitation * 10) / 10,
    });
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    monthly: monthly.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)),
  };
}
