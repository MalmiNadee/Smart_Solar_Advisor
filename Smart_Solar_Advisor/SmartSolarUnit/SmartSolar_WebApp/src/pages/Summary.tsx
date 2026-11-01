import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EnergyBarChart } from "@/components/charts/EnergyBarChart";
import { useSolarSites, usePredictionData } from "@/hooks/useBackendAPI";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Zap, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimeRange = "daily" | "weekly" | "monthly";

const Summary: React.FC = () => {
  const { isAdmin } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");
  const { sites } = useSolarSites();

  // Redirect site owners away from summary page
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Get first running site for demo
  const runningSite = sites.find((s) => s.status === "running");
  const { dailyTotal, monthlyTotal } = usePredictionData(
    runningSite?.customer_name || null,
    runningSite?.id || null
  );

  // Mock data for different time ranges
  const dailyData = [
    { label: "00:00", value: 0 },
    { label: "04:00", value: 0 },
    { label: "08:00", value: 0.15 },
    { label: "10:00", value: 0.35 },
    { label: "12:00", value: 0.52 },
    { label: "14:00", value: 0.48 },
    { label: "16:00", value: 0.25 },
    { label: "18:00", value: 0.08 },
    { label: "20:00", value: 0 },
  ];

  const weeklyData = [
    { label: "Mon", value: 2.5 },
    { label: "Tue", value: 3.2 },
    { label: "Wed", value: 2.8 },
    { label: "Thu", value: 3.5 },
    { label: "Fri", value: 3.1 },
    { label: "Sat", value: 2.9 },
    { label: "Sun", value: dailyTotal * 10 || 2.7 },
  ];

  const monthlyData = [
    { label: "Week 1", value: 18.5 },
    { label: "Week 2", value: 21.2 },
    { label: "Week 3", value: 19.8 },
    { label: "Week 4", value: monthlyTotal || 22.1 },
  ];

  const getChartData = () => {
    switch (timeRange) {
      case "daily":
        return dailyData;
      case "weekly":
        return weeklyData;
      case "monthly":
        return monthlyData;
      default:
        return dailyData;
    }
  };

  const getChartTitle = () => {
    switch (timeRange) {
      case "daily":
        return "Hourly Energy Generation";
      case "weekly":
        return "Daily Energy Generation";
      case "monthly":
        return "Weekly Energy Generation";
      default:
        return "Energy Generation";
    }
  };

  const totalEnergy = getChartData().reduce((sum, d) => sum + d.value, 0);
  const avgEnergy = totalEnergy / getChartData().length;
  const peakEnergy = Math.max(...getChartData().map((d) => d.value));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Energy Summary</h1>
            <p className="text-muted-foreground">
              Aggregated energy generation statistics
            </p>
          </div>
          <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
            {(["daily", "weekly", "monthly"] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant="ghost"
                size="sm"
                className={cn(
                  "capitalize",
                  timeRange === range && "bg-card shadow-sm"
                )}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Energy"
            value={`${totalEnergy.toFixed(2)} kWh`}
            subtitle={`${timeRange} total`}
            icon={Zap}
            variant="accent"
          />
          <StatsCard
            title="Average"
            value={`${avgEnergy.toFixed(2)} kWh`}
            subtitle={`Per ${timeRange === "daily" ? "hour" : timeRange === "weekly" ? "day" : "week"}`}
            icon={BarChart3}
          />
          <StatsCard
            title="Peak Generation"
            value={`${peakEnergy.toFixed(2)} kWh`}
            subtitle="Maximum recorded"
            icon={TrendingUp}
            variant="success"
          />
          <StatsCard
            title="Active Sites"
            value={sites.filter((s) => s.status === "running").length}
            subtitle="Currently generating"
            icon={Calendar}
          />
        </div>

        {/* Main Chart */}
        <EnergyBarChart
          data={getChartData()}
          title={getChartTitle()}
          subtitle={`${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} view • All sites combined`}
        />

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Generation Breakdown
            </h3>
            <div className="space-y-4">
              {getChartData().map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-16">{item.label}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-solar rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.value / peakEnergy) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-20 text-right">
                    {item.value.toFixed(2)} kWh
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Performance Metrics
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Capacity Factor</p>
                <p className="text-2xl font-bold text-foreground">
                  {((totalEnergy / (sites.reduce((sum, s) => sum + s.system_kw, 0) * 24)) * 100 || 18.5).toFixed(1)}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">System Efficiency</p>
                <p className="text-2xl font-bold text-foreground">94.2%</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">CO₂ Offset</p>
                <p className="text-2xl font-bold text-success">
                  {(totalEnergy * 0.42).toFixed(1)} kg
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Cost Savings</p>
                <p className="text-2xl font-bold text-accent">
                  ${(totalEnergy * 0.12).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Summary;
