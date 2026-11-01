import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

export interface EnergyData {
  label: string;
  value: number;
  date?: string; // Optional date field for day details
}

interface EnergyBarChartProps {
  data: EnergyData[];
  title: string;
  subtitle?: string;
  className?: string;
  onBarClick?: (data: EnergyData) => void;
}

export const EnergyBarChart: React.FC<EnergyBarChartProps> = ({
  data,
  title,
  subtitle,
  className,
  onBarClick,
}) => {
  return (
    <div
      className={cn(
        "p-6 rounded-xl bg-card border border-border animate-fade-in",
        className
      )}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            onClick={onBarClick ? (data: any) => {
              if (data && data.activePayload && data.activePayload[0]) {
                const clickedData = data.activePayload[0].payload as EnergyData;
                onBarClick(clickedData);
              }
            } : undefined}
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
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              unit=" kWh"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(4)} kWh`, "Energy"]}
            />
            <Bar
              dataKey="value"
              fill="hsl(var(--solar-orange))"
              radius={[4, 4, 0, 0]}
              style={onBarClick ? { cursor: 'pointer' } : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
