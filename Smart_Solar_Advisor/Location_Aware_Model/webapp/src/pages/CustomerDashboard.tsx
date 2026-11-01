import { useMemo, useState } from "react";
import { LocationInput } from "@/components/LocationInput";
import { NearestDataCards } from "@/components/NearestDataCards";
import { MonthlyCharts } from "@/components/MonthlyCharts";
import { DailyCharts } from "@/components/DailyCharts";
import { RealtimeWeather } from "@/components/RealtimeWeather";
import { FinancialCalculator } from "@/components/FinancialCalculator";
import { BatteryBackupEstimator } from "@/components/BatteryBackupEstimator";
import { fetchNearestLocation, fetchAggregateData, fetchRealtimeWeather } from "@/services/api";
import type { SolarRecord, AggregateResponse, WeatherResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Loader2, Sun, Zap } from "lucide-react";

const BASE_SYSTEM_KW = 5;

interface WeatherTip {
  type: "Rain" | "Wind" | "Temperature";
  severity: "good" | "warning";
  message: string;
}

const CustomerDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [nearestRecord, setNearestRecord] = useState<SolarRecord | null>(null);
  const [monthlyData, setMonthlyData] = useState<AggregateResponse | null>(null);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [totalEnergy, setTotalEnergy] = useState<number | null>(null);
  const [systemKw, setSystemKw] = useState(BASE_SYSTEM_KW);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  const scaleFactor = systemKw / BASE_SYSTEM_KW;

  const weatherTips = useMemo<WeatherTip[]>(() => {
    if (!weatherData?.current) return [];

    const current = weatherData.current;
    const todayRain = weatherData.daily?.precipitation_sum?.[0] ?? current.precipitation ?? 0;
    const todayMax = weatherData.daily?.temperature_2m_max?.[0];
    const todayMin = weatherData.daily?.temperature_2m_min?.[0];

    const tempText =
      typeof todayMin === "number" && typeof todayMax === "number"
        ? `${Math.round(todayMin)}-${Math.round(todayMax)}°C`
        : `${Math.round(current.temperature_2m)}°C`;
    const absLat = Math.abs(weatherData.latitude ?? 0);
    const locationProfile = absLat < 15 ? "humid" : absLat < 30 ? "warm" : "mild";
    const feltTemp = current.apparent_temperature ?? current.temperature_2m;
    const tempRef = typeof todayMax === "number" ? todayMax : current.temperature_2m;
    const rainSeverity: WeatherTip["severity"] = todayRain > 8 ? "warning" : "good";
    const windSeverity: WeatherTip["severity"] = current.wind_speed_10m > 20 ? "warning" : "good";
    const tempSeverity: WeatherTip["severity"] = tempRef > 35 || tempRef < 16 ? "warning" : "good";

    const rainAlert =
      todayRain >= 10
        ? "Heavy rain likely today. Keep umbrella/raincoat ready and expect wet travel conditions."
        : todayRain >= 3
          ? "Light to moderate rain is possible today. Keep rain protection with you."
          : "No major rain expected today. Outdoor movement should be easier.";

    const windAlert =
      current.wind_speed_10m >= 30
        ? "Strong wind expected today. Outdoor conditions can change quickly."
        : current.wind_speed_10m >= 18
          ? "Breezy weather expected today, especially in open areas."
          : "Winds are generally mild today.";

    const tempAlert =
      (typeof todayMax === "number" ? todayMax : current.temperature_2m) >= 35
        ? `Hot day expected (${tempText}). Stay hydrated and avoid long afternoon sun exposure.`
        : (typeof todayMax === "number" ? todayMax : current.temperature_2m) >= 30
          ? `Warm weather expected today (${tempText}). Keep water with you during daytime travel.`
          : `Pleasant to mild temperature expected today (${tempText}).`;

    return [
      {
        type: "Rain",
        severity: rainSeverity,
        message:
          todayRain > 8
            ? "Heavy rain is expected today. Keep an umbrella or raincoat ready and allow extra travel time."
            : todayRain >= 2
              ? "Light rain may happen today. Keep rain protection with you if going out."
              : locationProfile === "humid"
                ? "No major rain expected, but humidity can still be high in your area."
                : "No major rain expected today. Outdoor plans can continue normally.",
      },
      {
        type: "Wind",
        severity: windSeverity,
        message:
          current.wind_speed_10m > 30
            ? "Strong wind expected today. Be careful in open areas and with loose outdoor items."
            : current.wind_speed_10m >= 15
              ? "Breezy weather expected. You may feel gusts in open roads and rooftops."
              : "Wind is light today and outdoor movement should feel comfortable.",
      },
      {
        type: "Temperature",
        severity: tempSeverity,
        message:
          tempRef > 35
            ? `Very hot weather today (${tempText}). It may feel like ${Math.round(feltTemp)}°C, so avoid long afternoon sun exposure.`
            : tempRef >= 30
              ? `Warm weather today (${tempText}). It may feel like ${Math.round(feltTemp)}°C, so keep water with you.`
              : tempRef < 16
                ? `Cool weather today (${tempText}). It may feel like ${Math.round(feltTemp)}°C, so carry a light layer if needed.`
                : `Comfortable weather today (${tempText}) with a feel-like temperature near ${Math.round(feltTemp)}°C.`,
      },
    ];
  }, [weatherData]);

  const handleSearch = async (lat: number, lng: number, kw: number) => {
    setLoading(true);
    setNearestRecord(null);
    setMonthlyData(null);
    setDailyData(null);
    setWeatherData(null);
    setTotalEnergy(null);
    setShowRecommendations(false);
    setSystemKw(kw);
    setLastLocation({ lat, lng });

    try {
      const [records, monthly, daily, weather] = await Promise.all([
        fetchNearestLocation(lat, lng),
        fetchAggregateData(lat, lng, "monthly"),
        fetchAggregateData(lat, lng, "daily"),
        fetchRealtimeWeather(lat, lng),
      ]);

      setNearestRecord(records?.[0] || null);
      setMonthlyData(monthly);
      setDailyData(daily);
      setWeatherData(weather);

      const factor = kw / BASE_SYSTEM_KW;
      if (daily) {
        const total = Object.values(daily).reduce((s, v) => s + v.total_predicted_kwh_per5min, 0);
        setTotalEnergy(+(total * factor).toFixed(2));
      }

      if (!records?.length) toast({ title: "No Data", description: "No records found for this location." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      toast({ title: "API Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <LocationInput onSearch={handleSearch} loading={loading} />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-solar-gold" />
        </div>
      )}

      {/* Real-Time Weather */}
      {!loading && weatherData && <RealtimeWeather data={weatherData} />}

      {/* Total Energy Focus Box */}
      {!loading && totalEnergy !== null && (
        <div className="card-solar gradient-gold text-center py-8">
          <Zap className="h-10 w-10 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium text-primary/70 uppercase tracking-wide">Total Predicted Energy</p>
          <p className="text-5xl font-extrabold text-primary tracking-tight mt-1">{totalEnergy}</p>
          <p className="text-lg font-semibold text-primary/80 mt-1">kWh</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Sun className="h-4 w-4 text-primary/60" />
            <p className="text-sm text-primary/60">
              Based on <span className="font-bold">{systemKw} kW</span> system
              {systemKw !== BASE_SYSTEM_KW && (
                <span className="ml-1">(scaled ×{scaleFactor.toFixed(1)} from {BASE_SYSTEM_KW} kW base)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Financial Calculator */}
      {!loading && totalEnergy !== null && (
        <FinancialCalculator totalEnergyKwh={totalEnergy} systemKw={systemKw} />
      )}

      {!loading && lastLocation && (
        <BatteryBackupEstimator
          latitude={lastLocation.lat}
          longitude={lastLocation.lng}
          systemKw={systemKw}
        />
      )}

      {!loading && weatherData && (
        <div className="card-solar relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-100/50 via-sky-100/35 to-cyan-100/45" />
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="relative z-10">
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">Location Weather Alerts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Real-Time Personalized Weather Alerts Based on Your Location
              </p>
            </div>
            <button
              type="button"
              className="relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
              onClick={() => setShowRecommendations((prev) => !prev)}
            >
              <Lightbulb className="h-4 w-4" />
              {showRecommendations ? "Hide Alerts" : "Show Alerts"}
            </button>
          </div>

          {showRecommendations && (
            <div className="relative z-10 mt-4 space-y-3">
              {weatherTips.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {weatherTips.map((item, idx) => (
                      <div
                        key={`tip-${idx}`}
                        className={`rounded-2xl border p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                          item.severity === "warning"
                            ? "border-red-300/80 bg-gradient-to-b from-red-50/95 to-rose-50/80"
                            : "border-emerald-300/80 bg-gradient-to-b from-emerald-50/95 to-green-50/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="font-semibold text-sm text-foreground">{item.type}</p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                                item.severity === "warning"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {item.severity === "warning" ? "Weather Warning" : "Good Alert"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-foreground/85 leading-relaxed">{item.message}</p>
                      </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Loading alerts...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && nearestRecord && <NearestDataCards record={nearestRecord} />}
      {!loading && dailyData && <DailyCharts data={dailyData} scaleFactor={scaleFactor} systemKw={systemKw} />}
      {!loading && monthlyData && <MonthlyCharts data={monthlyData} scaleFactor={scaleFactor} systemKw={systemKw} />}

      {!loading && !nearestRecord && !monthlyData && !dailyData && (
        <div className="card-solar text-center py-16">
          <div className="gradient-gold rounded-2xl p-4 inline-block mb-4">
            <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Analyze</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Click on the map or enter coordinates to analyze solar energy potential.
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
