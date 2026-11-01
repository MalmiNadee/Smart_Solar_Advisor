import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { format, parse } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { LiveCounter } from "@/components/dashboard/LiveCounter";
import { SensorChart } from "@/components/charts/SensorChart";
import { EnergyBarChart } from "@/components/charts/EnergyBarChart";
import { DayDetailsModal } from "@/components/charts/DayDetailsModal";
import { PowerGauge } from "@/components/charts/PowerGauge";
import { DayProgressChart } from "@/components/charts/DayProgressChart";
import { useDailyPredictions } from "@/hooks/useDailyPredictions";
import {
  useSolarSite,
  useSensorData,
  usePredictionData,
} from "@/hooks/useBackendAPI";
import {
  ArrowLeft,
  Sun,
  Zap,
  Battery,
  Cpu,
  Calendar,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Signal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SiteDetail: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const { isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { site, loading: siteLoading, error: siteError } = useSolarSite(siteId || null);
  const { data: sensorData, loading: sensorLoading } = useSensorData(
    site?.device_id || null
  );
  const { data: predictionData, dailyTotal, monthlyTotal, loading: predictionLoading } = usePredictionData(
    site?.customer_name || null,
    siteId || null
  );
  // Use site creation date as start date for the 30-day chart
  const startDate = site?.created_at || null;

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
    return Number(value);
  }, [predictionData]);
  
  const { dailyData: monthlyDailyData, loading: dailyLoading } = useDailyPredictions(
    site?.customer_name || null,
    siteId || null,
    30,
    startDate
  );

  // Calculate 30-day period dates and statistics
  const dateStats = useMemo(() => {
    if (!site?.created_at) {
      return null;
    }

    // Parse start date (assuming created_at is in a parseable format)
    let start: Date;
    try {
      // Try to parse the date (could be ISO string or other format)
      start = new Date(site.created_at);
      if (isNaN(start.getTime())) {
        // If parsing fails, use current date - 30 days as fallback
        start = new Date();
        start.setDate(start.getDate() - 30);
      }
    } catch {
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    // Calculate end date (30 days from start)
    const end = new Date(start);
    end.setDate(end.getDate() + 30);

    // Current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Calculate completed days (from start to today, max 30)
    const completedDays = Math.max(0, Math.min(30, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))));

    // Calculate remaining days (from today to end, min 0)
    const remainingDays = Math.max(0, Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      startDate: start,
      endDate: end,
      completedDays,
      remainingDays,
      totalDays: 30,
    };
  }, [site?.created_at]);

  if (siteLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (siteError || !site) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Sun className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Site Not Found</h2>
          <p className="text-muted-foreground mb-4">{siteError || "The requested site does not exist."}</p>
          <Link to="/sites">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sites
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Prepare chart data
  const irradianceChartData = sensorData.slice(-30).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    lux: d.bh1750?.lux_avg || 0,
  }));

  const tempHumidityChartData = sensorData.slice(-30).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temp: d.dht_avg?.temp_c || 0,
    humidity: d.dht_avg?.["hum_%"] || 0,
  }));

  const dustRainChartData = sensorData.slice(-30).map((d) => {
    const avgRain = ((d.rain?.pct1 || 0) + (d.rain?.pct2 || 0)) / 2;
    return {
      time: new Date(d.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      dust: d.dust?.mg_m3 || 0,
      rain: 100 - avgRain,
    };
  });

  const predictionChartData = predictionData.slice(-30).map((d) => {
    // Format timestamp as time (HH:MM)
    let timeStr = "";
    if (d.timestamp) {
      try {
        // Handle different timestamp formats
        let date: Date;
        if (typeof d.timestamp === 'string' && d.timestamp.includes('_')) {
          // Format: YYYYMMDD_HHMMSS
          const datePart = d.timestamp.substring(0, 8);
          const timePart = d.timestamp.substring(9, 15);
          const year = parseInt(datePart.substring(0, 4));
          const month = parseInt(datePart.substring(4, 6)) - 1;
          const day = parseInt(datePart.substring(6, 8));
          const hour = parseInt(timePart.substring(0, 2));
          const minute = parseInt(timePart.substring(2, 4));
          date = new Date(year, month, day, hour, minute);
        } else {
          date = new Date(d.timestamp);
        }
        timeStr = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        timeStr = "";
      }
    }
    return {
      time: timeStr,
      predicted: d.predicted_kwh_5min || 0, // Keep in kWh
    };
  });

  // Prepare 30 days of daily energy data
  const dailyEnergyData = monthlyDailyData.map((day) => {
    const date = parse(day.date, 'yyyyMMdd', new Date());
    const dayLabel = format(date, 'MMM dd');
    return {
      label: dayLabel,
      value: day.totalKwh,
      date: day.date, // Store date for modal
    };
  });

  const handleBarClick = (data: any) => {
    if (data.date) {
      setSelectedDate(data.date);
      setIsModalOpen(true);
    }
  };

  const latestSensor = sensorData[sensorData.length - 1];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Link to="/sites">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{site.site_name}</h1>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  site.status === "running"
                    ? "bg-success/10 text-success"
                    : site.status === "completed"
                    ? "bg-muted text-muted-foreground"
                    : "bg-warning/10 text-warning"
                )}
              >
                {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
              </span>
            </div>
            <p className="text-muted-foreground">{site.customer_name}</p>
          </div>
          {site.status === "running" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
              <span className="relative w-2 h-2 rounded-full bg-success status-pulse" />
              Live Data
            </div>
          )}
        </div>

        {/* Gauge Meter + Energy Counters + Live Data Layout */}
        {site && site.system_kw > 0 && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Left Column: Gauge Meter */}
            <div className="flex justify-center lg:justify-start h-full w-full">
              <PowerGauge
                predictedKwh5min={currentPredictedKwh5min}
                capacity={site.system_kw}
                siteName={site.site_name}
                loading={predictionLoading}
                isDeviceActive={deviceStatus.isActive}
                lastReadingMinutes={deviceStatus.lastReadingMinutes}
              />
            </div>
            
            {/* Right Column: Energy Counters + Live Data */}
            <div className="flex flex-col gap-4 h-full w-full">
              {/* Top Row: Today's and Monthly Predicted Energy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
              
              {/* Bottom: Live Data */}
              {latestSensor && (
                <div className="p-6 rounded-xl bg-card border border-border flex-1 w-full">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Live Data</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Sun className="w-4 h-4" />
                        <span className="text-xs">Irradiance</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {latestSensor.bh1750?.lux_avg?.toFixed(1) || 0} lux
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Thermometer className="w-4 h-4" />
                        <span className="text-xs">Temperature</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {latestSensor.dht_avg?.temp_c?.toFixed(1) || 0}°C
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Droplets className="w-4 h-4" />
                        <span className="text-xs">Humidity</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {latestSensor.dht_avg?.["hum_%"]?.toFixed(1) || 0}%
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Wind className="w-4 h-4" />
                        <span className="text-xs">Dust</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {latestSensor.dust?.mg_m3?.toFixed(3) || 0} mg/m³
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <CloudRain className="w-4 h-4" />
                        <span className="text-xs">Rain</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {100 - (((latestSensor.rain?.pct1 || 0) + (latestSensor.rain?.pct2 || 0)) / 2)}%
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Signal className="w-4 h-4" />
                        <span className="text-xs">Signal</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{latestSensor.rssi} dBm</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Details */}
        <div className="w-full p-6 rounded-xl bg-card border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">System Details</h3>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">System Size</p>
                <p className="font-semibold text-foreground">{site.system_kw} kW</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Sun className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Panels</p>
                <p className="font-semibold text-foreground">
                  {site.panel_count}x {site.panel_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Battery className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inverter</p>
                <p className="font-semibold text-foreground">
                  {site.inverter_type} ({site.inverter_capacity_kw} kW)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Device ID</p>
                <p className="font-semibold text-foreground">{site.device_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-semibold text-foreground">{site.created_at}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 30-Day Period Tracking */}
        {dateStats && (
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">30-Day Period Tracking</h3>
            
            {/* Date Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(dateStats.startDate, "MMM dd, yyyy")}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">End Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(dateStats.endDate, "MMM dd, yyyy")}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-success/10">
                <p className="text-xs text-muted-foreground mb-1">Completed Days</p>
                <p className="text-lg font-bold text-success">{dateStats.completedDays}</p>
              </div>
              <div className="p-4 rounded-lg bg-warning/10">
                <p className="text-xs text-muted-foreground mb-1">Remaining Days</p>
                <p className="text-lg font-bold text-warning">{dateStats.remainingDays}</p>
              </div>
            </div>

            {/* Day Chart - Visual representation */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-foreground mb-3">Progress Chart</h4>
              <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                {/* Completed days */}
                <div
                  className="absolute left-0 top-0 h-full bg-success transition-all duration-500 ease-out flex items-center justify-center"
                  style={{ width: `${(dateStats.completedDays / dateStats.totalDays) * 100}%` }}
                >
                  {dateStats.completedDays > 0 && (
                    <span className="text-xs font-medium text-success-foreground">
                      {dateStats.completedDays} days
                    </span>
                  )}
                </div>
                {/* Remaining days */}
                <div
                  className="absolute right-0 top-0 h-full bg-warning/30 transition-all duration-500 ease-out flex items-center justify-center"
                  style={{ width: `${(dateStats.remainingDays / dateStats.totalDays) * 100}%` }}
                >
                  {dateStats.remainingDays > 0 && (
                    <span className="text-xs font-medium text-warning-foreground">
                      {dateStats.remainingDays} days
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Total: {dateStats.totalDays} days</span>
                <span>{Math.round((dateStats.completedDays / dateStats.totalDays) * 100)}% Complete</span>
              </div>
            </div>
          </div>
        )}

        {/* Day-by-Day Progress Chart */}
        {dateStats && (
          <DayProgressChart
            startDate={dateStats.startDate}
            endDate={dateStats.endDate}
            completedDays={dateStats.completedDays}
            remainingDays={dateStats.remainingDays}
            totalDays={dateStats.totalDays}
          />
        )}

        {/* Sensor Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensorChart
            data={irradianceChartData}
            dataKeys={[
              { key: "lux", color: "hsl(var(--chart-irradiance))", label: "Irradiance" },
            ]}
            title="Solar Irradiance"
            unit=" lux"
          />
          <SensorChart
            data={tempHumidityChartData}
            dataKeys={[
              { key: "temp", color: "hsl(var(--chart-temperature))", label: "Temperature (°C)" },
              { key: "humidity", color: "hsl(var(--chart-humidity))", label: "Humidity (%)" },
            ]}
            title="Temperature & Humidity"
            unit=""
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensorChart
            data={dustRainChartData}
            dataKeys={[
              { key: "dust", color: "hsl(var(--muted-foreground))", label: "Dust (mg/m³)", yAxisId: "left" },
              { key: "rain", color: "hsl(var(--chart-humidity))", label: "Rain (%)", yAxisId: "right" },
            ]}
            title="Dust & Rain"
            unit=""
            rightYAxisDomain={[0, 100]}
          />
          <SensorChart
            data={predictionChartData}
            dataKeys={[
              { key: "predicted", color: "hsl(var(--chart-prediction))", label: "Predicted (kWh)" },
            ]}
            title="5-Minute Energy Predictions"
            unit=" kWh"
          />
        </div>

        {/* Daily Energy Chart */}
        <EnergyBarChart
          data={dailyEnergyData}
          title="Daily Energy Generation (Last 30 Days)"
          subtitle="Click on any bar to view detailed 5-minute predictions for that day"
          onBarClick={handleBarClick}
        />
      </div>

      {/* Day Details Modal */}
      {selectedDate && site && (
        <DayDetailsModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          date={selectedDate}
          customerName={site.customer_name}
          siteId={site.id}
          dailyTotal={
            monthlyDailyData.find((d) => d.date === selectedDate)?.totalKwh || 0
          }
        />
      )}
    </DashboardLayout>
  );
};

export default SiteDetail;
