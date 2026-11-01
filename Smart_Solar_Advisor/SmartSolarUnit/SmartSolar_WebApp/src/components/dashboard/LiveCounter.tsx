import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LiveCounterProps {
  value: number;
  unit: string;
  label: string;
  decimals?: number;
  className?: string;
}

export const LiveCounter: React.FC<LiveCounterProps> = ({
  value,
  unit,
  label,
  decimals = 4,
  className,
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    // Animate the counter when value changes
    const duration = 500;
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div
      className={cn(
        "p-6 rounded-xl bg-gradient-to-br from-deep-blue to-deep-blue-light text-primary-foreground",
        className
      )}
      style={{ height: "400px", width: "100%" }}
    >
      <p className="text-sm font-medium text-primary-foreground/70 mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold font-mono tracking-tight">
          {displayValue.toFixed(decimals)}
        </span>
        <span className="text-lg font-medium text-primary-foreground/80">{unit}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
        <span className="text-xs text-primary-foreground/60">Updating in real-time</span>
      </div>
    </div>
  );
};
