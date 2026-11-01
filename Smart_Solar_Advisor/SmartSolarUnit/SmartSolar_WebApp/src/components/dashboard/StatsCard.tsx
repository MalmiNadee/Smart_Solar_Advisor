import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "accent" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  default: {
    card: "bg-card",
    icon: "bg-secondary text-secondary-foreground",
  },
  accent: {
    card: "bg-card border-accent/20",
    icon: "gradient-solar text-accent-foreground glow-orange",
  },
  success: {
    card: "bg-card border-success/20",
    icon: "bg-success text-success-foreground glow-success",
  },
  warning: {
    card: "bg-card border-warning/20",
    icon: "bg-warning text-warning-foreground",
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "p-6 rounded-xl border border-border card-hover animate-fade-in",
        styles.card,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground animate-count">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-sm font-medium mt-2",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}% from yesterday
            </p>
          )}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            styles.icon
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
