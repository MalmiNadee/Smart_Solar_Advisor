// Solar Site Types
export interface SolarSite {
  id: string;
  site_name: string;
  customer_name: string;
  device_id: string;
  system_kw: number;
  panel_type: string;
  panel_count: number;
  inverter_type: string;
  inverter_capacity_kw: number;
  status: "running" | "completed" | "maintenance";
  created_at: string;
  /** Optional: for weather and seasonal trends (latitude) */
  latitude?: number;
  /** Optional: for weather and seasonal trends (longitude) */
  longitude?: number;
  /** Optional: display name for location */
  city?: string;
}

// Sensor Data Types
export interface SensorData {
  timestamp: string;
  device_id: string;
  bh1750: {
    lux1: number;
    lux2: number;
    lux_avg: number;
  };
  dht1: {
    "hum_%": number;
    temp_c: number;
  };
  dht2: {
    "hum_%": number;
    temp_c: number;
  };
  dht_avg: {
    temp_c: number;
    "hum_%": number;
  };
  dust: {
    mg_m3: number;
    raw: number;
    voltage: number;
  };
  rain: {
    pct1: number;
    pct2: number;
    raw1: number;
    raw2: number;
  };
  rssi: number;
}

// Prediction Data Types
export interface PredictionData {
  timestamp?: string;
  device_id: string;
  features_used: {
    dust_level: number;
    humidity: number;
    irradiance: number;
    rainfall: number;
    temperature: number;
  };
  interval: string;
  panel_area_m2: number;
  predicted_kwh_5min: number;
  unit: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalSites: number;
  runningSystems: number;
  completedSystems: number;
  todayPredictedKwh: number;
  monthlyPredictedKwh: number;
}

// Chart Data Point
export interface ChartDataPoint {
  time: string;
  value: number;
  label?: string;
}

// User Types
export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "site_owner";
  name?: string;
}

// Weather API types (seasonal trend forecasting)
export interface WeatherCurrent {
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  weather_code: number | null;
  cloud_cover: number | null;
  time: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface WeatherForecastDay {
  date: string;
  temperature_2m_max: number | null;
  temperature_2m_min: number | null;
  precipitation_sum: number | null;
  weather_code: number | null;
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: WeatherForecastDay[];
}

export interface WeatherMonthlyTrend {
  yearMonth: string;
  monthName: string;
  year: number;
  month: number;
  avgTemperature: number | null;
  precipitationSum: number;
}

export interface WeatherSeasonal {
  latitude: number;
  longitude: number;
  timezone: string;
  monthly: WeatherMonthlyTrend[];
}

export interface PredictionMonthlyBreakdownItem {
  yearMonth: string;
  yearMonthLabel: string;
  month: number;
  year: number;
  totalKwh: number;
  readingsCount: number;
}

// Full Year Forecast Types
export interface FullYearForecastItem {
  yearMonth: string;
  monthName: string;
  year: number;
  month: number;
  avgTemperature: number;
  precipitationSum: number;
  predictedSolarKwh: number;
  baselineKwh: number;
  adjustmentFactor: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface FullYearForecast {
  latitude: number;
  longitude: number;
  systemCapacity: number;
  historicalAverage: number;
  forecast: FullYearForecastItem[];
}

// Low Prediction Explanation Types
export interface ExplanationFactor {
  name: string;
  impact: 'high' | 'medium' | 'low';
  value: number;
  unit: string;
  explanation: string;
  contribution?: number;
}

export interface LowPredictionExplanation {
  isLow: boolean;
  predictedKwh: number;
  averageKwh: number;
  percentage: number;
  threshold?: number;
  factors?: ExplanationFactor[];
  recommendations?: string[];
  date?: string;
  message?: string;
}

// Feature Importance Types
export interface FeatureImportance {
  features: Array<{ name: string; importance: number }>;
  method: string;
  note?: string;
}
