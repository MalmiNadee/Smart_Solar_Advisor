import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PowerGaugeProps {
  predictedKwh5min: number; // 5-minute predicted kWh (direct value)
  capacity: number; // System capacity in kW
  maxPredictedKwh5min?: number; // Max predicted kWh from 5-minute predictions (optional)
  siteName?: string; // Optional site name to display
  loading?: boolean; // Loading state
  isDeviceActive?: boolean; // Device active/inactive status
  lastReadingMinutes?: number | null; // Minutes since last reading
  className?: string;
}

export const PowerGauge: React.FC<PowerGaugeProps> = ({
  predictedKwh5min,
  capacity,
  maxPredictedKwh5min,
  siteName,
  loading = false,
  isDeviceActive = true,
  lastReadingMinutes = null,
  className,
}) => {
  // Ensure predictedKwh5min is a valid number, default to 0
  // For display: if device is inactive, show 0
  // For max calculation: use actual value even if device is inactive
  const safePredictedKwh5min = useMemo(() => {
    if (predictedKwh5min === null || predictedKwh5min === undefined || isNaN(predictedKwh5min)) {
      return 0;
    }
    // Ensure it's a valid positive number
    const value = Number(predictedKwh5min);
    return isNaN(value) || value < 0 ? 0 : value;
  }, [predictedKwh5min]);

  // Value to display (0 if device is inactive, otherwise actual value)
  const displayValue = useMemo(() => {
    return isDeviceActive ? safePredictedKwh5min : 0;
  }, [safePredictedKwh5min, isDeviceActive]);

  // Calculate max based on capacity: capacity (kW) * (5/60) hours = capacity / 12 kWh
  const capacityKwh5min = capacity / 12;
  
  // Function to round up to a nice round number and get increment
  const getNiceMaxAndIncrement = (value: number): { max: number; increment: number } => {
    if (value <= 0) return { max: 10, increment: 1 };
    
    // Get the order of magnitude
    const magnitude = Math.floor(Math.log10(value));
    const power = Math.pow(10, magnitude);
    
    // Normalize the value
    const normalized = value / power;
    
    let niceMax: number;
    let increment: number;
    
    // Determine nice max and increment based on normalized value
    // Examples:
    // - 15.622 -> normalized ~1.56 -> max=20, increment=2 (0,2,4,6,8,10,12,14,16,18,20)
    // - 62.5 -> normalized ~6.25 -> max=100, increment=10 (0,10,20,30,40,50,60,70,80,90,100)
    if (normalized <= 1) {
      niceMax = 1 * power;
      increment = 0.1 * power;
    } else if (normalized <= 2) {
      niceMax = 2 * power;
      increment = 0.2 * power;
    } else if (normalized <= 5) {
      niceMax = 5 * power;
      increment = 0.5 * power;
    } else if (normalized <= 10) {
      niceMax = 10 * power;
      increment = 1 * power;
    } else if (normalized <= 20) {
      // For values like 15.622, round up to 20 with increment of 2
      niceMax = 20 * power;
      increment = 2 * power;
    } else if (normalized <= 50) {
      niceMax = 50 * power;
      increment = 5 * power;
    } else {
      // For values like 62.5, round up to 100 with increment of 10
      niceMax = 100 * power;
      increment = 10 * power;
    }
    
    return { max: niceMax, increment };
  };
  
  // Calculate max automatically based on last 5-minute reading + 25%
  // Max = last reading * 1.25 (last reading + 25% of last reading)
  const calculatedMax = useMemo(() => {
    // If device is inactive, use capacity-based max as fallback
    if (!isDeviceActive) {
      return Math.max(capacityKwh5min, 0.1);
    }
    
    // If no reading or reading is 0, use capacity-based max
    if (!safePredictedKwh5min || safePredictedKwh5min === 0) {
      return Math.max(capacityKwh5min, 0.1);
    }
    
    // Calculate max as last reading + 25% = last reading * 1.25
    return safePredictedKwh5min * 1.25;
  }, [safePredictedKwh5min, isDeviceActive, capacityKwh5min]);
  
  // Round the calculated max to a nice round number and get increment
  const { max: effectiveMax, increment: tickIncrement } = useMemo(() => {
    return getNiceMaxAndIncrement(calculatedMax);
  }, [calculatedMax]);

  // Calculate angle for the arrow (0° = left, 180° = right)
  // Gauge spans from -135° to 135° (270° total arc)
  const minAngle = -135;
  const maxAngle = 135;
  const angleRange = maxAngle - minAngle;

  const arrowAngle = useMemo(() => {
    if (effectiveMax === 0) return minAngle;
    const percentage = Math.min(100, Math.max(0, (displayValue / effectiveMax) * 100));
    return minAngle + (percentage / 100) * angleRange;
  }, [displayValue, effectiveMax, minAngle, angleRange]);

  // Color based on percentage
  const percentage = useMemo(() => {
    if (effectiveMax === 0) return 0;
    return Math.min(100, Math.max(0, (displayValue / effectiveMax) * 100));
  }, [displayValue, effectiveMax]);

  const getColor = () => {
    if (percentage < 50) return "hsl(142, 76%, 36%)"; // success green
    if (percentage < 80) return "hsl(38, 92%, 50%)"; // warning yellow
    return "hsl(0, 84%, 60%)"; // danger red
  };

  // SVG parameters
  const size = 500;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 180;
  const arrowLength = 140;

  // Calculate arrow tip position
  const arrowTipX = centerX + arrowLength * Math.cos((arrowAngle * Math.PI) / 180);
  const arrowTipY = centerY + arrowLength * Math.sin((arrowAngle * Math.PI) / 180);

  // Generate tick marks and labels with round numbers
  const ticks = useMemo(() => {
    const tickValues: number[] = [];
    let currentValue = 0;
    
    // Generate ticks with the calculated increment
    while (currentValue <= effectiveMax) {
      tickValues.push(currentValue);
      currentValue += tickIncrement;
    }
    
    // Ensure we have at least 2 ticks (0 and max)
    if (tickValues.length < 2) {
      tickValues.push(effectiveMax);
    }
    
    // Map to angles
    return tickValues.map((value) => {
      const percentage = effectiveMax > 0 ? (value / effectiveMax) * 100 : 0;
      const angle = minAngle + (percentage / 100) * angleRange;
      return { value, angle };
    });
  }, [effectiveMax, tickIncrement, minAngle, angleRange]);

  return (
    <div
      className={cn(
        "p-6 rounded-xl bg-card border border-border animate-fade-in",
        className
      )}
    >
      {siteName && (
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold text-foreground">{siteName}</h3>
        </div>
      )}
      <div className="flex flex-col items-center justify-center">
        {/* Device Status */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isDeviceActive ? "bg-success animate-pulse" : "bg-destructive"
            }`}
          />
          <span className={`text-sm font-medium ${
            isDeviceActive ? "text-success" : "text-destructive"
          }`}>
            {isDeviceActive ? "Device Active" : "Device Inactive"}
          </span>
          {lastReadingMinutes !== null && (
            <span className="text-xs text-muted-foreground">
              (Last reading: {
                (() => {
                  // Calculate total seconds from minutes (for possible future usage)
                  const totalSeconds = lastReadingMinutes * 60;
                  const days = Math.floor(lastReadingMinutes / (60 * 24));
                  const hours = Math.floor((lastReadingMinutes % (60 * 24)) / 60);
                  const minutes = Math.floor(lastReadingMinutes % 60);
                  // If you want to keep seconds accurate, you could add a prop for seconds as well.
                  // Here, since input is only minutes, seconds will always be 0.
                  const seconds = 0;
                  let str = "";
                  if (days > 0) str += `${days}d `;
                  if (hours > 0 || days > 0) str += `${hours}h `;
                  if (minutes > 0 || hours > 0 || days > 0) str += `${minutes}m `;
                  str += `${seconds}s ago`;
                  return str.trim();
                })()
              })
            </span>
          )}
        </div>

        {/* Gauge SVG - Rotated 90 degrees to the left */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="overflow-hidden" style={{ transform: 'rotate(-90deg)' }} viewBox={`0 0 ${size} ${size}`}>
            {/* Gauge arc background */}
            <path
              d={`M ${centerX + radius * Math.cos((minAngle * Math.PI) / 180)} ${
                centerY + radius * Math.sin((minAngle * Math.PI) / 180)
              } A ${radius} ${radius} 0 0 1 ${
                centerX + radius * Math.cos((maxAngle * Math.PI) / 180)
              } ${centerY + radius * Math.sin((maxAngle * Math.PI) / 180)}`}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              className="opacity-20"
            />

            {/* Tick marks and labels */}
            {ticks.map((tick, index) => {
              const tickAngle = (tick.angle * Math.PI) / 180;
              const tickStartX = centerX + (radius - 15) * Math.cos(tickAngle);
              const tickStartY = centerY + (radius - 15) * Math.sin(tickAngle);
              const tickEndX = centerX + (radius + 5) * Math.cos(tickAngle);
              const tickEndY = centerY + (radius + 5) * Math.sin(tickAngle);
              const labelX = centerX + (radius + 25) * Math.cos(tickAngle);
              const labelY = centerY + (radius + 25) * Math.sin(tickAngle);

              return (
                <g key={index}>
                  <line
                    x1={tickStartX}
                    y1={tickStartY}
                    x2={tickEndX}
                    y2={tickEndY}
                    stroke="hsl(var(--foreground))"
                    strokeWidth="2"
                    className="opacity-60"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-foreground opacity-70"
                    fontSize="10"
                    transform={`rotate(90 ${labelX} ${labelY})`}
                  >
                    {tick.value.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Colored arc showing current value */}
            <path
              d={`M ${centerX + radius * Math.cos((minAngle * Math.PI) / 180)} ${
                centerY + radius * Math.sin((minAngle * Math.PI) / 180)
              } A ${radius} ${radius} 0 ${
                Math.abs(arrowAngle - minAngle) > 180 ? 1 : 0
              } 1 ${centerX + radius * Math.cos((arrowAngle * Math.PI) / 180)} ${
                centerY + radius * Math.sin((arrowAngle * Math.PI) / 180)
              }`}
              fill="none"
              stroke={getColor()}
              strokeWidth="8"
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />

            {/* Arrow/Needle */}
            <g
              transform={`rotate(${arrowAngle} ${centerX} ${centerY})`}
              className="transition-transform duration-500 ease-out"
            >
              {/* Arrow shaft */}
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX + arrowLength}
                y2={centerY}
                stroke={getColor()}
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Arrow tip */}
              <polygon
                points={`${centerX + arrowLength},${centerY} ${centerX + arrowLength - 12},${
                  centerY - 6
                } ${centerX + arrowLength - 12},${centerY + 6}`}
                fill={getColor()}
              />
              {/* Center circle */}
              <circle
                cx={centerX}
                cy={centerY}
                r="8"
                fill="hsl(var(--background))"
                stroke={getColor()}
                strokeWidth="3"
              />
            </g>

            {/* Center content as SVG text - rotated back to normal */}
            <g transform={`rotate(90 ${centerX} ${centerY})`}>
              <text
                x={centerX}
                y={centerY - 50}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                fontSize="14"
                fontWeight="500"
              >
                5-Min Rate
              </text>
              {loading ? (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  fontSize="48"
                  fontWeight="bold"
                >
                  -
                </text>
              ) : (
                <>
                  <text
                    x={centerX}
                    y={centerY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground"
                    fontSize="48"
                    fontWeight="bold"
                  >
                    {displayValue.toFixed(2)}
                  </text>
                  <text
                    x={centerX}
                    y={centerY + 40}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    fontSize="18"
                  >
                    kWh
                  </text>
                </>
              )}
            </g>
          </svg>
        </div>

        {/* Capacity info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">PV Capacity</p>
          <p className="text-xl font-semibold text-foreground">
            {capacity.toFixed(2)} kWp
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max: {effectiveMax.toFixed(3)} kWh/5min
          </p>
        </div>

        {/* Additional info */}
        <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: getColor() }}
            />
            <span>
              {percentage.toFixed(1)}% of {effectiveMax.toFixed(3)} kWh
            </span>
          </div>
          {maxPredictedKwh5min && maxPredictedKwh5min !== capacityKwh5min && (
            <span className="text-xs text-muted-foreground/70">
              Max adjusted from prediction
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
