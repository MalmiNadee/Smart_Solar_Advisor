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
import { FeatureImportance } from "@/types/solar";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface FeatureImportanceChartProps {
  data: FeatureImportance | null;
  loading?: boolean;
  className?: string;
}

export const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({
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
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Loading feature importance...
        </div>
      </div>
    );
  }

  if (!data || !data.features || data.features.length === 0) {
    return (
      <div
        className={cn(
          "p-6 rounded-xl bg-card border border-border animate-fade-in",
          className
        )}
      >
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No feature importance data available
        </div>
      </div>
    );
  }

  const chartData = data.features.map((f) => ({
    name: f.name.charAt(0).toUpperCase() + f.name.slice(1).replace(/_/g, " "),
    importance: Math.round(f.importance * 1000) / 1000,
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
            <BarChart3 className="w-5 h-5" />
            Feature Importance
          </h3>
          <p className="text-sm text-muted-foreground">
            Relative importance of factors affecting predictions ({data.method})
          </p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
              formatter={(value: number) => [value.toFixed(3), "Importance"]}
            />
            <Bar dataKey="importance" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.note && (
        <div className="mt-4 text-xs text-muted-foreground">
          <p>{data.note}</p>
        </div>
      )}
    </div>
  );
};
