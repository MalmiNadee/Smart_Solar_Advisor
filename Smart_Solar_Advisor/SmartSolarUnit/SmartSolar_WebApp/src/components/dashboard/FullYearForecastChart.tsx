import React from "react";
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
import { FullYearForecast } from "@/types/solar";
import { cn } from "@/lib/utils";
import { Calendar, TrendingUp } from "lucide-react";

interface FullYearForecastChartProps {
  data: FullYearForecast | null;
  loading?: boolean;
  className?: string;
}

export const FullYearForecastChart: React.FC<FullYearForecastChartProps> = ({
  data,
  loading,
  className,
}) => {
  if (loading) {
    return (
      <div
        className={cn(
          "p-6 rounded-xl bg-card border border-border animate-fade-in",
          className
        )}
      >
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          Loading full year forecast...
        </div>
      </div>
    );
  }

  if (!data || !data.forecast || data.forecast.length === 0) {
    return (
      <div
        className={cn(
          "p-6 rounded-xl bg-card border border-border animate-fade-in",
          className
        )}
      >
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          No forecast data available
        </div>
      </div>
    );
  }

  const chartData = data.forecast.map((item) => ({
    month: item.monthName,
    label: `${item.monthName} ${item.year.toString().slice(2)}`,
    temperature: item.avgTemperature,
    solarKwh: Math.round(item.predictedSolarKwh * 100) / 100,
    confidence: item.confidence,
  }));

  return (
    <div
      className={cn(
        "p-6 rounded-xl bg-card border border-border animate-fade-in",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Full Year Forecast (12 Months Ahead)
          </h3>
          <p className="text-sm text-muted-foreground">
            Predicted solar yield based on seasonal trends and weather patterns
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          Seasonal adjusted
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
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
                name === "temperature" ? `${value} °C` : `${value} kWh`,
                name === "temperature" ? "Avg temperature" : "Predicted solar",
              ]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="Avg temperature"
              stroke="hsl(var(--chart-temperature))"
              strokeWidth={2}
              dot={{ r: 3 }}
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
      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          Historical average: {data.historicalAverage.toFixed(2)} kWh/month | System capacity:{" "}
          {data.systemCapacity} kW
        </p>
      </div>
    </div>
  );
};
