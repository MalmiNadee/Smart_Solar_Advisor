import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  color?: "gold" | "blue" | "green" | "sky";
}

const colorMap = {
  gold: "bg-solar-gold-light text-solar-amber",
  blue: "bg-primary/10 text-primary",
  green: "bg-solar-green-light text-solar-green",
  sky: "bg-sky-100 text-solar-sky",
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * progress * 100) / 100);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{typeof value === "number" && value % 1 !== 0 ? display.toFixed(2) : Math.round(display)}</>;
};

export const KPICard = ({ title, value, unit, icon: Icon, color = "blue" }: KPICardProps) => {
  return (
    <div className="card-solar animate-count-up">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="kpi-number text-foreground">
            {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
            {unit && <span className="ml-1 text-lg font-medium text-muted-foreground">{unit}</span>}
          </p>
        </div>
        <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
