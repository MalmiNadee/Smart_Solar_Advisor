import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SensorChart } from "@/components/charts/SensorChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { predictionsAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Zap, TrendingUp } from "lucide-react";
import { format, parse } from "date-fns";

interface DayDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYYMMDD format
  customerName: string;
  siteId: string;
  dailyTotal: number;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  open,
  onOpenChange,
  date,
  customerName,
  siteId,
  dailyTotal,
}) => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !date) return;

    const fetchDayPredictions = async () => {
      try {
        setLoading(true);
        // Format: YYYYMMDD
        const startDate = `${date}_000000`;
        const endDate = `${date}_235959`;
        
        const data = await predictionsAPI.getByRange(customerName, siteId, startDate, endDate);
        
        // Sort by timestamp
        const sorted = data.sort((a, b) => {
          const tsA = a.timestamp || '';
          const tsB = b.timestamp || '';
          return tsA.localeCompare(tsB);
        });
        
        setPredictions(sorted);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch day predictions");
        console.error("Error fetching day predictions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDayPredictions();
  }, [open, date, customerName, siteId]);

  // Format date for display
  const displayDate = date
    ? format(parse(date, 'yyyyMMdd', new Date()), 'MMMM dd, yyyy')
    : '';

  // Prepare chart data for 5-minute intervals
  const predictionChartData = predictions.map((pred) => {
    // Timestamp format: YYYYMMDD_HHMMSS
    const timestamp = pred.timestamp || '';
    const timeStr = timestamp.length >= 13 
      ? `${timestamp.substring(9, 11)}:${timestamp.substring(11, 13)}`
      : '';
    
    return {
      time: timeStr,
      predicted: pred.predicted_kwh_5min || 0,
    };
  });

  // Prepare multi-line chart data for environmental features
  const featuresChartData = predictions.map((pred) => {
    const timestamp = pred.timestamp || '';
    const timeStr = timestamp.length >= 13 
      ? `${timestamp.substring(9, 11)}:${timestamp.substring(11, 13)}`
      : '';
    
    const rawRainfall = pred.features_used?.rainfall || 0;
    return {
      time: timeStr,
      irradiance: pred.features_used?.irradiance || 0,
      temperature: pred.features_used?.temperature || 0,
      humidity: pred.features_used?.humidity || 0,
      dustLevel: pred.features_used?.dust_level || 0,
      rainfall: 100 - rawRainfall,
    };
  });

  // Calculate hourly aggregates for hourly chart
  const hourlyData = predictions.reduce((acc: any, pred) => {
    const timestamp = pred.timestamp || '';
    if (timestamp.length >= 11) {
      const hour = parseInt(timestamp.substring(9, 11));
      if (!acc[hour]) {
        acc[hour] = { hour, total: 0, count: 0 };
      }
      acc[hour].total += pred.predicted_kwh_5min || 0;
      acc[hour].count += 1;
    }
    return acc;
  }, {});

  const hourlyChartData = Object.values(hourlyData)
    .map((h: any) => ({
      time: `${String(h.hour).padStart(2, '0')}:00`,
      predicted: h.total,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  // Calculate stats
  const maxPrediction = predictions.length > 0
    ? Math.max(...predictions.map(p => p.predicted_kwh_5min || 0), 0)
    : 0;
  const avgPrediction = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + (p.predicted_kwh_5min || 0), 0) / predictions.length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {displayDate} - Energy Predictions
          </DialogTitle>
          <DialogDescription>
            Detailed 5-minute interval predictions for the selected day
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Total Energy</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {dailyTotal.toFixed(4)} kWh
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Peak 5-Min</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {maxPrediction.toFixed(4)} kWh
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Avg 5-Min</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {avgPrediction.toFixed(4)} kWh
                </p>
              </div>
            </div>

            {/* Hourly Chart */}
            {hourlyChartData.length > 0 && (
              <SensorChart
                data={hourlyChartData}
                dataKeys={[
                  {
                    key: "predicted",
                    color: "hsl(var(--chart-prediction))",
                    label: "Hourly Energy (kWh)",
                  },
                ]}
                title="Hourly Energy Generation"
                unit=" kWh"
              />
            )}

            {/* 5-Minute Interval Chart */}
            {predictionChartData.length > 0 && (
              <SensorChart
                data={predictionChartData}
                dataKeys={[
                  {
                    key: "predicted",
                    color: "hsl(var(--solar-orange))",
                    label: "5-Min Prediction (kWh)",
                  },
                ]}
                title="5-Minute Interval Predictions"
                unit=" kWh"
              />
            )}

            {/* Environmental Features Multi-Line Chart */}
            {featuresChartData.length > 0 && (
              <MultiLineChart
                data={featuresChartData}
                dataKeys={[
                  {
                    key: "irradiance",
                    color: "#fbbf24", // amber/yellow for sun
                    label: "Irradiance",
                    yAxisId: "right",
                    unit: "lux",
                  },
                  {
                    key: "temperature",
                    color: "#ef4444", // red for temperature
                    label: "Temperature",
                    yAxisId: "left",
                    unit: "°C",
                  },
                  {
                    key: "humidity",
                    color: "#3b82f6", // blue for humidity
                    label: "Humidity",
                    yAxisId: "left",
                    unit: "%",
                  },
                  {
                    key: "dustLevel",
                    color: "#8b5cf6", // purple for dust
                    label: "Dust Level",
                    yAxisId: "left",
                    unit: "",
                  },
                  {
                    key: "rainfall",
                    color: "#06b6d4", // cyan for rain
                    label: "Rainfall",
                    yAxisId: "left",
                    unit: "",
                  },
                ]}
                title="Environmental Features (5-Minute Intervals)"
              />
            )}

            {/* 5-Minute Data Table */}
            {predictions.length > 0 && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-4">
                  5-Minute Interval Details ({predictions.length} readings)
                </h4>
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground mb-2 pb-2 border-b sticky top-0 bg-card">
                    <div>Time</div>
                    <div>Predicted (kWh)</div>
                    <div>Irradiance</div>
                    <div>Temperature</div>
                    <div>Humidity</div>
                    <div>Dust Level</div>
                    <div>Rainfall</div>
                  </div>
                  <div className="space-y-1">
                    {predictions.map((pred, idx) => {
                      const timestamp = pred.timestamp || '';
                      const timeStr = timestamp.length >= 13
                        ? `${timestamp.substring(9, 11)}:${timestamp.substring(11, 13)}`
                        : timestamp;
                      
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-7 gap-2 text-xs py-2 px-2 rounded hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium">{timeStr}</div>
                          <div>{(pred.predicted_kwh_5min || 0).toFixed(4)}</div>
                          <div>
                            {pred.features_used?.irradiance?.toFixed(2) || 'N/A'}
                          </div>
                          <div>
                            {pred.features_used?.temperature?.toFixed(1) || 'N/A'}°C
                          </div>
                          <div>
                            {pred.features_used?.humidity?.toFixed(1) || 'N/A'}%
                          </div>
                          <div>
                            {pred.features_used?.dust_level?.toFixed(3) || 'N/A'}
                          </div>
                          <div>
                            {pred.features_used?.rainfall !== undefined 
                              ? (100 - pred.features_used.rainfall).toFixed(2) 
                              : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

