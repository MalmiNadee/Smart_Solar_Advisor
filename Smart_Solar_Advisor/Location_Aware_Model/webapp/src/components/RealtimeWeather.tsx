import type { WeatherResponse } from "@/services/api";
import {
  Thermometer, Droplets, Wind, Cloud, Sun, Gauge, ArrowUp,
  CloudRain, Snowflake, Eye, Waves
} from "lucide-react";

const weatherDescriptions: Record<number, { label: string; icon: React.ReactNode }> = {
  0: { label: "Clear Sky", icon: <Sun className="h-8 w-8 text-amber-500" /> },
  1: { label: "Mainly Clear", icon: <Sun className="h-8 w-8 text-amber-400" /> },
  2: { label: "Partly Cloudy", icon: <Cloud className="h-8 w-8 text-muted-foreground" /> },
  3: { label: "Overcast", icon: <Cloud className="h-8 w-8 text-muted-foreground" /> },
  45: { label: "Fog", icon: <Eye className="h-8 w-8 text-muted-foreground" /> },
  48: { label: "Rime Fog", icon: <Eye className="h-8 w-8 text-muted-foreground" /> },
  51: { label: "Light Drizzle", icon: <CloudRain className="h-8 w-8 text-sky-400" /> },
  53: { label: "Moderate Drizzle", icon: <CloudRain className="h-8 w-8 text-sky-500" /> },
  55: { label: "Dense Drizzle", icon: <CloudRain className="h-8 w-8 text-sky-600" /> },
  61: { label: "Slight Rain", icon: <CloudRain className="h-8 w-8 text-blue-400" /> },
  63: { label: "Moderate Rain", icon: <CloudRain className="h-8 w-8 text-blue-500" /> },
  65: { label: "Heavy Rain", icon: <CloudRain className="h-8 w-8 text-blue-600" /> },
  71: { label: "Slight Snow", icon: <Snowflake className="h-8 w-8 text-sky-200" /> },
  73: { label: "Moderate Snow", icon: <Snowflake className="h-8 w-8 text-sky-300" /> },
  75: { label: "Heavy Snow", icon: <Snowflake className="h-8 w-8 text-sky-400" /> },
  80: { label: "Rain Showers", icon: <CloudRain className="h-8 w-8 text-blue-500" /> },
  95: { label: "Thunderstorm", icon: <CloudRain className="h-8 w-8 text-purple-500" /> },
};

const getWeatherInfo = (code: number) =>
  weatherDescriptions[code] || { label: "Unknown", icon: <Cloud className="h-8 w-8 text-muted-foreground" /> };

interface WeatherCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  accent?: string;
}

const WeatherCard = ({ icon, label, value, unit, accent = "bg-muted/50" }: WeatherCardProps) => (
  <div className={`flex items-center gap-3 rounded-xl p-3 ${accent} transition-colors`}>
    <div className="flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {typeof value === "number" ? value.toFixed(1) : value}
        <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
      </p>
    </div>
  </div>
);

const windDirection = (deg: number) => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

export const RealtimeWeather = ({ data }: { data: WeatherResponse }) => {
  const c = data.current;
  const weather = getWeatherInfo(c.weathercode);
  const timeStr = new Date(c.time).toLocaleString();

  return (
    <div className="card-solar animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-solar-sky" />
          <h3 className="text-lg font-semibold text-foreground">🌤️ Real-Time Weather</h3>
        </div>
        <span className="text-xs text-muted-foreground">{timeStr}</span>
      </div>

      {/* Hero weather */}
      <div className="flex items-center gap-6 mb-6 p-5 rounded-2xl bg-gradient-to-r from-solar-sky/10 to-solar-gold/10 border border-border">
        <div className="flex-shrink-0">{weather.icon}</div>
        <div>
          <p className="text-4xl font-extrabold text-foreground tracking-tight">
            {c.temperature_2m.toFixed(1)}°C
          </p>
          <p className="text-sm text-muted-foreground">
            Feels like {c.apparent_temperature.toFixed(1)}°C · {weather.label}
          </p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-2xl font-bold text-solar-gold">{c.shortwave_radiation.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">W/m² Solar Radiation</p>
        </div>
      </div>

      {/* Grid of metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <WeatherCard icon={<Droplets className="h-5 w-5 text-sky-500" />} label="Humidity" value={c.relative_humidity_2m} unit="%" />
        <WeatherCard icon={<Cloud className="h-5 w-5 text-muted-foreground" />} label="Cloud Cover" value={c.cloud_cover} unit="%" />
        <WeatherCard icon={<Wind className="h-5 w-5 text-teal-500" />} label="Wind Speed" value={c.wind_speed_10m} unit="km/h" />
        <WeatherCard icon={<ArrowUp className="h-5 w-5 text-teal-400" style={{ transform: `rotate(${c.wind_direction_10m}deg)` }} />} label={`Wind Dir (${windDirection(c.wind_direction_10m)})`} value={c.wind_direction_10m} unit="°" />
        <WeatherCard icon={<Waves className="h-5 w-5 text-teal-600" />} label="Wind Gusts" value={c.wind_gusts_10m} unit="km/h" />
        <WeatherCard icon={<Gauge className="h-5 w-5 text-indigo-400" />} label="Pressure" value={c.surface_pressure} unit="hPa" />
        <WeatherCard icon={<CloudRain className="h-5 w-5 text-blue-500" />} label="Precipitation" value={c.precipitation} unit="mm" />
        <WeatherCard icon={<CloudRain className="h-5 w-5 text-blue-400" />} label="Rain" value={c.rain} unit="mm" />
      </div>

      {/* Solar radiation details */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">☀️ Solar Radiation Breakdown</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <WeatherCard icon={<Sun className="h-5 w-5 text-amber-500" />} label="Shortwave" value={c.shortwave_radiation} unit="W/m²" accent="bg-solar-gold-light/50" />
          <WeatherCard icon={<Sun className="h-5 w-5 text-orange-500" />} label="Direct" value={c.direct_radiation} unit="W/m²" accent="bg-solar-gold-light/50" />
          <WeatherCard icon={<Sun className="h-5 w-5 text-yellow-500" />} label="Diffuse" value={c.diffuse_radiation} unit="W/m²" accent="bg-solar-gold-light/50" />
          <WeatherCard icon={<Sun className="h-5 w-5 text-red-400" />} label="Global Tilted" value={c.global_tilted_irradiance} unit="W/m²" accent="bg-solar-gold-light/50" />
        </div>
      </div>
    </div>
  );
};
