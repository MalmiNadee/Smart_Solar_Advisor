import React, { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LiveCounter } from "@/components/dashboard/LiveCounter";
import { SensorChart } from "@/components/charts/SensorChart";
import { PowerGauge } from "@/components/charts/PowerGauge";
import {
  useSolarSites,
  useSensorData,
  usePredictionData,
  useWeatherSeasonal,
  usePredictionMonthlyBreakdown,
  useFullYearForecast,
  useLowPredictionExplanation,
  useFeatureImportance,
} from "@/hooks/useBackendAPI";
import { LowPredictionAlert } from "@/components/dashboard/LowPredictionAlert";
import { FullYearForecastChart } from "@/components/dashboard/FullYearForecastChart";
import { FeatureImportanceChart } from "@/components/dashboard/FeatureImportanceChart";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Sun,
  Zap,
  CheckCircle2,
  TrendingUp,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Dashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { sites, loading: sitesLoading } = useSolarSites();

  // Get first running site for demo data
  const runningSite = sites.find((s) => s.status === "running");
  const { data: sensorData } = useSensorData(runningSite?.device_id || null);
  const { data: predictionData, dailyTotal, monthlyTotal, loading: predictionLoading } = usePredictionData(
    runningSite?.customer_name || null,
    runningSite?.id || null
  );
  const { data: weatherSeasonal, loading: weatherSeasonalLoading } = useWeatherSeasonal(
    runningSite?.latitude,
    runningSite?.longitude
  );
  const { data: monthlyBreakdown, loading: monthlyBreakdownLoading } = usePredictionMonthlyBreakdown(
    runningSite?.customer_name || null,
    runningSite?.id || null
  );
  const { data: fullYearForecast, loading: forecastLoading } = useFullYearForecast(
    runningSite?.customer_name || null,
    runningSite?.id || null,
    runningSite?.latitude,
    runningSite?.longitude
  );
  const { data: lowPredictionExplanation, loading: explanationLoading } = useLowPredictionExplanation(
    runningSite?.customer_name || null,
    runningSite?.id || null
  );
  const { data: featureImportance, loading: importanceLoading } = useFeatureImportance(
    runningSite?.customer_name || null,
    runningSite?.id || null
  );

  // Check device active/inactive status based on last sensor reading
  const deviceStatus = useMemo(() => {
    if (!sensorData || sensorData.length === 0) return { isActive: false, lastReadingMinutes: null };

    // Get the most recent sensor reading
    const sorted = [...sensorData].sort((a, b) => {
      const tsA = new Date(a.timestamp).getTime();
      const tsB = new Date(b.timestamp).getTime();
      return tsB - tsA; // Descending order (newest first)
    });

    const latestReading = sorted[0];
    if (!latestReading || !latestReading.timestamp) return { isActive: false, lastReadingMinutes: null };

    // Calculate minutes since last reading
    const lastReadingTime = new Date(latestReading.timestamp).getTime();
    const now = new Date().getTime();
    const minutesAgo = Math.floor((now - lastReadingTime) / (1000 * 60));

    // Device is active if last reading is within 24 hours (1440 minutes)
    const isActive = minutesAgo <= 1440;

    return { isActive, lastReadingMinutes: minutesAgo };
  }, [sensorData]);

  // Get the last/most recent 5-minute predicted kWh value
  // Get the actual prediction value even if device is inactive (for max calculation)
  const currentPredictedKwh5min = useMemo(() => {
    if (!predictionData || predictionData.length === 0) return 0;

    // Sort by timestamp to ensure we get the most recent one
    const sorted = [...predictionData].sort((a, b) => {
      const tsA = a.timestamp || '';
      const tsB = b.timestamp || '';
      return tsB.localeCompare(tsA); // Descending order (newest first)
    });

    // Get the most recent prediction (first after sorting)
    const latest = sorted[0];

    // Ensure we return 0 if the value is null, undefined, or NaN
    const value = latest?.predicted_kwh_5min;
    if (value === null || value === undefined || isNaN(Number(value))) return 0;

    // Return the actual value (including 0)
    // Note: If device is inactive, this value will be displayed as 0 in the gauge,
    // but we still use it for max calculation
    return Number(value);
  }, [predictionData]);

  // Max is now calculated automatically in PowerGauge component
  // based on last reading + 25%, so we don't need to calculate it here

  // Get system capacity
  const systemCapacity = runningSite?.system_kw || 0;

  const runningSystems = sites.filter((s) => s.status === "running").length;
  const completedSystems = sites.filter((s) => s.status === "completed").length;

  // Prepare chart data
  const irradianceData = sensorData.slice(-20).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    lux: d.bh1750?.lux_avg || 0,
  }));

  const temperatureData = sensorData.slice(-20).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temp: d.dht_avg?.temp_c || 0,
    humidity: d.dht_avg?.["hum_%"] || 0,
  }));

  // Merge weather monthly trends with prediction monthly breakdown for seasonal chart
  const seasonalChartData = useMemo(() => {
    const weatherByMonth = new Map(
      (weatherSeasonal?.monthly || []).map((m) => [m.yearMonth, m])
    );
    return (monthlyBreakdown || []).map((p) => {
      const w = weatherByMonth.get(p.yearMonthLabel);
      return {
        month: p.yearMonthLabel,
        label: `${p.yearMonthLabel.slice(5)}/${String(p.year).slice(2)}`,
        avgTemp: w?.avgTemperature ?? null,
        precipitation: w?.precipitationSum ?? 0,
        solarKwh: Math.round(p.totalKwh * 1000) / 1000,
      };
    });
  }, [weatherSeasonal?.monthly, monthlyBreakdown]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? "Dashboard Overview" : "My Solar Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Real-time monitoring of all solar energy systems"
              : "Real-time monitoring of your solar energy systems"}
          </p>
        </div>

        {/* Power Gauge + Stats Grid - 2 Column Layout */}
        {runningSite && systemCapacity > 0 ? (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Left Column: Gauge Meter */}
            <div className="flex justify-center lg:justify-start h-full w-full">
              <PowerGauge
                predictedKwh5min={currentPredictedKwh5min}
                capacity={systemCapacity}
                siteName={runningSite.site_name}
                loading={predictionLoading}
                isDeviceActive={deviceStatus.isActive}
                lastReadingMinutes={deviceStatus.lastReadingMinutes}
              />
            </div>

            {/* Right Column: Stats Grid 2x2 + Live Counters */}
            <div className="flex flex-col gap-4 h-full w-full">
              {/* Stats Grid 2x2 */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {isAdmin ? (
                  <>
                    <StatsCard
                      title="Total Sites"
                      value={sitesLoading ? "-" : sites.length}
                      subtitle="Registered solar installations"
                      icon={Sun}
                      variant="accent"
                    />
                    <StatsCard
                      title="Running Systems"
                      value={sitesLoading ? "-" : runningSystems}
                      subtitle="Currently active"
                      icon={Zap}
                      variant="success"
                    />
                    <StatsCard
                      title="Completed Systems"
                      value={sitesLoading ? "-" : completedSystems}
                      subtitle="Installation complete"
                      icon={CheckCircle2}
                    />
                    <StatsCard
                      title="Today's Prediction"
                      value={`${dailyTotal.toFixed(4)} kWh`}
                      subtitle="Total energy forecast"
                      icon={TrendingUp}
                      variant="accent"
                    />
                  </>
                ) : (
                  <>
                    <StatsCard
                      title="My Sites"
                      value={sitesLoading ? "-" : sites.length}
                      subtitle="Your solar installations"
                      icon={Sun}
                      variant="accent"
                    />
                    <StatsCard
                      title="Active Systems"
                      value={sitesLoading ? "-" : runningSystems}
                      subtitle="Currently generating"
                      icon={Zap}
                      variant="success"
                    />
                    <StatsCard
                      title="Today's Energy"
                      value={`${dailyTotal.toFixed(4)} kWh`}
                      subtitle="Predicted generation"
                      icon={TrendingUp}
                      variant="accent"
                    />
                    <StatsCard
                      title="Monthly Energy"
                      value={`${monthlyTotal.toFixed(4)} kWh`}
                      subtitle="This month's forecast"
                      icon={CheckCircle2}
                    />
                  </>
                )}
              </div>

              {/* Live Counters below the 2x2 grid */}
              <div className="grid grid-cols-2 gap-4 w-full">
                <LiveCounter
                  value={dailyTotal}
                  unit="kWh"
                  label="Today's Predicted Energy"
                />
                <LiveCounter
                  value={monthlyTotal}
                  unit="kWh"
                  label="Monthly Predicted Energy"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Fallback: Stats Grid if no running site */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isAdmin ? (
              <>
                <StatsCard
                  title="Total Sites"
                  value={sitesLoading ? "-" : sites.length}
                  subtitle="Registered solar installations"
                  icon={Sun}
                  variant="accent"
                />
                <StatsCard
                  title="Running Systems"
                  value={sitesLoading ? "-" : runningSystems}
                  subtitle="Currently active"
                  icon={Zap}
                  variant="success"
                />
                <StatsCard
                  title="Completed Systems"
                  value={sitesLoading ? "-" : completedSystems}
                  subtitle="Installation complete"
                  icon={CheckCircle2}
                />
                <StatsCard
                  title="Today's Prediction"
                  value={`${dailyTotal.toFixed(4)} kWh`}
                  subtitle="Total energy forecast"
                  icon={TrendingUp}
                  variant="accent"
                />
              </>
            ) : (
              <>
                <StatsCard
                  title="My Sites"
                  value={sitesLoading ? "-" : sites.length}
                  subtitle="Your solar installations"
                  icon={Sun}
                  variant="accent"
                />
                <StatsCard
                  title="Active Systems"
                  value={sitesLoading ? "-" : runningSystems}
                  subtitle="Currently generating"
                  icon={Zap}
                  variant="success"
                />
                <StatsCard
                  title="Today's Energy"
                  value={`${dailyTotal.toFixed(4)} kWh`}
                  subtitle="Predicted generation"
                  icon={TrendingUp}
                  variant="accent"
                />
                <StatsCard
                  title="Monthly Energy"
                  value={`${monthlyTotal.toFixed(4)} kWh`}
                  subtitle="This month's forecast"
                  icon={CheckCircle2}
                />
              </>
            )}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensorChart
            data={irradianceData}
            dataKeys={[
              { key: "lux", color: "hsl(var(--chart-irradiance))", label: "Irradiance" },
            ]}
            title="Solar Irradiance"
            unit=" lux"
          />
          <SensorChart
            data={temperatureData}
            dataKeys={[
              { key: "temp", color: "hsl(var(--chart-temperature))", label: "Temperature" },
              { key: "humidity", color: "hsl(var(--chart-humidity))", label: "Humidity" },
            ]}
            title="Temperature & Humidity"
            unit=""
          />
        </div>

        {/* Seasonal Trends: monthly temperature and predicted solar yield */}
        <div
          className={cn(
            "p-6 rounded-xl bg-card border border-border animate-fade-in"
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Seasonal Trends
              </h3>
              <p className="text-sm text-muted-foreground">
                Monthly average temperature (weather) and predicted solar yield — last 12 months
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CloudRain className="w-4 h-4" />
              Weather + yield
            </div>
          </div>
          {weatherSeasonalLoading || monthlyBreakdownLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading seasonal data…
            </div>
          ) : seasonalChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No monthly data yet. Add site coordinates for weather and ensure predictions exist.
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={seasonalChartData}
                  margin={{ top: 5, right: 50, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="temp"
                    stroke="hsl(var(--chart-temperature))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    unit=" °C"
                    label={{ value: "Avg temp (°C)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                  />
                  <YAxis
                    yAxisId="kwh"
                    orientation="right"
                    stroke="hsl(var(--chart-2))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    unit=" kWh"
                    label={{ value: "Solar (kWh)", angle: 90, position: "insideRight", style: { fontSize: 10 } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "avgTemp" ? `${value} °C` : `${value} kWh`,
                      name === "avgTemp" ? "Avg temperature" : "Predicted solar",
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="avgTemp"
                    name="Avg temperature"
                    stroke="hsl(var(--chart-temperature))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="kwh"
                    type="monotone"
                    dataKey="solarKwh"
                    name="Predicted solar (kWh)"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sensorData.length > 0 && (
            <>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Sun className="w-4 h-4" />
                  <span className="text-xs">Current Irradiance</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sensorData[sensorData.length - 1]?.bh1750?.lux_avg?.toFixed(1) || 0} lux
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Thermometer className="w-4 h-4" />
                  <span className="text-xs">Temperature</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sensorData[sensorData.length - 1]?.dht_avg?.temp_c?.toFixed(1) || 0}°C
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Droplets className="w-4 h-4" />
                  <span className="text-xs">Humidity</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sensorData[sensorData.length - 1]?.dht_avg?.["hum_%"]?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wind className="w-4 h-4" />
                  <span className="text-xs">Dust Level</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sensorData[sensorData.length - 1]?.dust?.mg_m3?.toFixed(2) || 0} mg/m³
                </p>
              </div>
            </>
          )}
          {sensorData.length === 0 && (
            <div className="col-span-4 p-8 rounded-lg bg-card border border-border text-center">
              <Sun className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No sensor data available. Connect your ESP32 device to start receiving data.
              </p>
            </div>
          )}
        </div>

        {/* Low Prediction Alert */}
        {/* {runningSite && (
          <LowPredictionAlert
            explanation={lowPredictionExplanation}
            loading={explanationLoading}
          />
        )} */}

        {/* Full Year Forecast */}
        {runningSite && (
          <FullYearForecastChart
            data={fullYearForecast}
            loading={forecastLoading}
          />
        )}

        {/* Feature Importance */}
        {runningSite && (
          <FeatureImportanceChart
            data={featureImportance}
            loading={importanceLoading}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
