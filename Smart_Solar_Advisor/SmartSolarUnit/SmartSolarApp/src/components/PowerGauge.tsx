import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Polygon, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

interface PowerGaugeProps {
  predictedKwh5min: number; // 5-minute predicted kWh (direct value)
  capacity: number; // System capacity in kW
  siteName?: string; // Optional site name to display
  loading?: boolean; // Loading state
  isDeviceActive?: boolean; // Device active/inactive status
  lastReadingMinutes?: number | null; // Minutes since last reading
}

export const PowerGauge: React.FC<PowerGaugeProps> = ({
  predictedKwh5min,
  capacity,
  siteName,
  loading = false,
  isDeviceActive = true,
  lastReadingMinutes = null,
}) => {
  const { colors } = useTheme();

  // Ensure predictedKwh5min is a valid number, default to 0
  const safePredictedKwh5min = useMemo(() => {
    if (predictedKwh5min === null || predictedKwh5min === undefined || isNaN(predictedKwh5min)) {
      return 0;
    }
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
    
    const magnitude = Math.floor(Math.log10(value));
    const power = Math.pow(10, magnitude);
    const normalized = value / power;
    
    let niceMax: number;
    let increment: number;
    
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
      niceMax = 20 * power;
      increment = 2 * power;
    } else if (normalized <= 50) {
      niceMax = 50 * power;
      increment = 5 * power;
    } else {
      niceMax = 100 * power;
      increment = 10 * power;
    }
    
    return { max: niceMax, increment };
  };
  
  // Calculate max automatically based on last 5-minute reading + 25%
  const calculatedMax = useMemo(() => {
    if (!isDeviceActive) {
      return Math.max(capacityKwh5min, 0.1);
    }
    if (!safePredictedKwh5min || safePredictedKwh5min === 0) {
      return Math.max(capacityKwh5min, 0.1);
    }
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
    if (percentage < 50) return '#22c55e'; // success green
    if (percentage < 80) return '#eab308'; // warning yellow
    return '#ef4444'; // danger red
  };

  // SVG parameters - responsive size for mobile
  const size = 350;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 120;
  const arrowLength = 95;

  // Generate tick marks and labels with round numbers
  const ticks = useMemo(() => {
    const tickValues: number[] = [];
    let currentValue = 0;
    
    while (currentValue <= effectiveMax) {
      tickValues.push(currentValue);
      currentValue += tickIncrement;
    }
    
    if (tickValues.length < 2) {
      tickValues.push(effectiveMax);
    }
    
    return tickValues.map((value) => {
      const percentage = effectiveMax > 0 ? (value / effectiveMax) * 100 : 0;
      const angle = minAngle + (percentage / 100) * angleRange;
      return { value, angle };
    });
  }, [effectiveMax, tickIncrement, minAngle, angleRange]);

  // Format last reading time
  const formatLastReading = () => {
    if (lastReadingMinutes === null) return '';
    const days = Math.floor(lastReadingMinutes / (60 * 24));
    const hours = Math.floor((lastReadingMinutes % (60 * 24)) / 60);
    const minutes = Math.floor(lastReadingMinutes % 60);
    let str = '';
    if (days > 0) str += `${days}d `;
    if (hours > 0 || days > 0) str += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) str += `${minutes}m ago`;
    return str.trim();
  };

  const color = getColor();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {siteName && (
        <View style={styles.siteNameContainer}>
          <Text style={[styles.siteName, { color: colors.text }]}>{siteName}</Text>
        </View>
      )}
      
      {/* Device Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: isDeviceActive ? colors.success : colors.danger }]} />
        <Text style={[styles.statusText, { color: isDeviceActive ? colors.success : colors.danger }]}>
          {isDeviceActive ? 'Device Active' : 'Device Inactive'}
        </Text>
        {lastReadingMinutes !== null && (
          <Text style={[styles.lastReadingText, { color: colors.textSecondary }]}>
            ({formatLastReading()})
          </Text>
        )}
      </View>

      {/* Gauge SVG - Rotated 90 degrees to the left */}
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
              <Stop offset="100%" stopColor="#16a34a" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#eab308" stopOpacity="1" />
              <Stop offset="100%" stopColor="#ca8a04" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
              <Stop offset="100%" stopColor="#dc2626" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#e0e7ff" stopOpacity="1" />
              <Stop offset="100%" stopColor="#c7d2fe" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Rotate entire gauge -90 degrees */}
          <G transform={`rotate(-90 ${centerX} ${centerY})`}>
            {/* Gauge arc background */}
            <Path
              d={`M ${centerX + radius * Math.cos((minAngle * Math.PI) / 180)} ${
                centerY + radius * Math.sin((minAngle * Math.PI) / 180)
              } A ${radius} ${radius} 0 0 1 ${
                centerX + radius * Math.cos((maxAngle * Math.PI) / 180)
              } ${centerY + radius * Math.sin((maxAngle * Math.PI) / 180)}`}
              fill="none"
              stroke={colors.gray || '#e5e7eb'}
              strokeWidth="8"
              opacity={0.2}
            />

            {/* Tick marks and labels */}
            {ticks.map((tick, index) => {
              const tickAngle = (tick.angle * Math.PI) / 180;
              const tickStartX = centerX + (radius - 12) * Math.cos(tickAngle);
              const tickStartY = centerY + (radius - 12) * Math.sin(tickAngle);
              const tickEndX = centerX + (radius + 4) * Math.cos(tickAngle);
              const tickEndY = centerY + (radius + 4) * Math.sin(tickAngle);
              const labelX = centerX + (radius + 20) * Math.cos(tickAngle);
              const labelY = centerY + (radius + 20) * Math.sin(tickAngle);

              return (
                <G key={index}>
                  <Line
                    x1={tickStartX}
                    y1={tickStartY}
                    x2={tickEndX}
                    y2={tickEndY}
                    stroke={colors.text || '#000'}
                    strokeWidth="2"
                    opacity={0.6}
                  />
                  <G transform={`rotate(90 ${labelX} ${labelY})`}>
                    <SvgText
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      fontSize="10"
                      fill={colors.text || '#000'}
                      opacity={0.7}
                    >
                      {tick.value.toFixed(2)}
                    </SvgText>
                  </G>
                </G>
              );
            })}

            {/* Colored arc showing current value */}
            <Path
              d={`M ${centerX + radius * Math.cos((minAngle * Math.PI) / 180)} ${
                centerY + radius * Math.sin((minAngle * Math.PI) / 180)
              } A ${radius} ${radius} 0 ${
                Math.abs(arrowAngle - minAngle) > 180 ? 1 : 0
              } 1 ${centerX + radius * Math.cos((arrowAngle * Math.PI) / 180)} ${
                centerY + radius * Math.sin((arrowAngle * Math.PI) / 180)
              }`}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Arrow/Needle */}
            <G transform={`rotate(${arrowAngle} ${centerX} ${centerY})`}>
              {/* Arrow shaft */}
              <Line
                x1={centerX}
                y1={centerY}
                x2={centerX + arrowLength}
                y2={centerY}
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Arrow tip */}
              <Polygon
                points={`${centerX + arrowLength},${centerY} ${centerX + arrowLength - 10},${
                  centerY - 5
                } ${centerX + arrowLength - 10},${centerY + 5}`}
                fill={color}
              />
              {/* Center circle */}
              <Circle
                cx={centerX}
                cy={centerY}
                r="8"
                fill={colors.background || '#fff'}
                stroke={color}
                strokeWidth="3"
              />
            </G>
          </G>
        </Svg>
        
        {/* Center content as React Native Text - positioned absolutely over SVG */}
        <View style={styles.centerTextContainer}>
          <Text style={[styles.centerLabel, { color: colors.textSecondary }]}>5-Min Rate</Text>
          {loading ? (
            <Text style={[styles.centerValue, { color: colors.textSecondary }]}>-</Text>
          ) : (
            <>
              <Text style={[styles.centerValue, { color: colors.text }]}>
                {displayValue.toFixed(2)}
              </Text>
              <Text style={[styles.centerUnit, { color: colors.textSecondary }]}>kWh</Text>
            </>
          )}
        </View>
      </View>

      {/* Capacity info */}
      <View style={styles.capacityContainer}>
        <Text style={[styles.capacityLabel, { color: colors.textSecondary }]}>PV Capacity</Text>
        <Text style={[styles.capacityValue, { color: colors.text }]}>
          {capacity.toFixed(2)} kWp
        </Text>
        <Text style={[styles.maxValue, { color: colors.textSecondary }]}>
          Max: {effectiveMax.toFixed(3)} kWh/5min
        </Text>
      </View>

      {/* Additional info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <View style={[styles.colorDot, { backgroundColor: color }]} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {percentage.toFixed(1)}% of {effectiveMax.toFixed(3)} kWh
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  siteNameContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  siteName: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lastReadingText: {
    fontSize: 10,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 350,
    height: 350,
    alignSelf: 'center',
    position: 'relative',
  },
  centerTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  centerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  centerValue: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 4,
  },
  centerUnit: {
    fontSize: 16,
  },
  capacityContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  capacityValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  maxValue: {
    fontSize: 10,
    marginTop: 4,
  },
  infoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 10,
  },
});

