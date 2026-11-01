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
import { cn } from "@/lib/utils";

interface ChartData {
  time: string;
  [key: string]: string | number;
}

interface MultiLineChartProps {
  data: ChartData[];
  dataKeys: {
    key: string;
    color: string;
    label: string;
    yAxisId?: "left" | "right";
    unit?: string;
  }[];
  title: string;
  className?: string;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  dataKeys,
  title,
  className,
}) => {
  // Determine which Y-axis to use for each line
  // Left axis: temperature, humidity, dustLevel, rainfall (smaller values)
  // Right axis: irradiance (larger values)
  const leftAxisKeys = dataKeys.filter(dk => 
    dk.yAxisId === "left" || 
    !dk.yAxisId || 
    ["temperature", "humidity", "dustLevel", "rainfall"].includes(dk.key)
  );
  const rightAxisKeys = dataKeys.filter(dk => 
    dk.yAxisId === "right" || 
    dk.key === "irradiance"
  );

  return (
    <div
      className={cn(
        "p-6 rounded-xl bg-card border border-border animate-fade-in",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">5-minute interval data</p>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            {leftAxisKeys.length > 0 && (
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={60}
              />
            )}
            {rightAxisKeys.length > 0 && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={60}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
            />
            <Legend />
            {dataKeys.map((dk) => (
              <Line
                key={dk.key}
                yAxisId={dk.yAxisId || (dk.key === "irradiance" ? "right" : "left")}
                type="monotone"
                dataKey={dk.key}
                name={dk.label + (dk.unit ? ` (${dk.unit})` : "")}
                stroke={dk.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

