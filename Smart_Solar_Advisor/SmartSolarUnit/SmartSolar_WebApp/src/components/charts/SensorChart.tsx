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

interface SensorChartProps {
  data: ChartData[];
  dataKeys: {
    key: string;
    color: string;
    label: string;
    yAxisId?: string;
  }[];
  title: string;
  unit: string;
  className?: string;
  yAxisDomain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
  leftYAxisDomain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
  rightYAxisDomain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
}

export const SensorChart: React.FC<SensorChartProps> = ({
  data,
  dataKeys,
  title,
  unit,
  className,
  yAxisDomain,
  leftYAxisDomain,
  rightYAxisDomain,
}) => {
  // Check if we need dual Y-axes
  const hasLeftAxis = dataKeys.some(dk => dk.yAxisId === 'left' || !dk.yAxisId);
  const hasRightAxis = dataKeys.some(dk => dk.yAxisId === 'right');
  const useDualAxis = hasLeftAxis && hasRightAxis;

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
          <p className="text-sm text-muted-foreground">Real-time monitoring</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: useDualAxis ? 30 : 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            {useDualAxis ? (
              <>
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={leftYAxisDomain || yAxisDomain}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={rightYAxisDomain}
                />
              </>
            ) : (
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit={unit}
                domain={yAxisDomain}
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
                type="monotone"
                dataKey={dk.key}
                name={dk.label}
                stroke={dk.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                yAxisId={useDualAxis ? (dk.yAxisId || 'left') : undefined}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
