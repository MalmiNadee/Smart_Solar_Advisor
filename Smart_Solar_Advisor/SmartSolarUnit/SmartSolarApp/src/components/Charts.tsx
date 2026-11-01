import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Svg, Path, Circle, G, Line as SvgLine } from 'react-native-svg';

interface LineChartPoint {
  x: number;
  y: number;
  timestamp?: Date | string;
  label?: string;
}

interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  unit?: string;
}

export function LineChart({ data, height = 250, color = '#F97316', showLabels = true, unit = '' }: LineChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const padding = { left: 50, right: 20, top: 20, bottom: 60 };
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate chart content width for scrolling
  const minPointSpacing = 30;
  const chartContentWidth = Math.max(screenWidth - padding.left - padding.right, data.length * minPointSpacing);
  const pointSpacing = chartContentWidth / Math.max(data.length - 1, 1);

  if (data.length === 0) return null;

  const maxY = Math.max(...data.map(d => d.y), 1);
  const minY = Math.min(...data.map(d => d.y), 0);
  const yRange = maxY - minY || 1;
  const yAxisSteps = 5;
  const yStep = yRange / yAxisSteps;

  // Calculate points with proper bounds - ensure all points are within chart area
  const points = data.map((point, index) => {
    const x = Math.max(0, Math.min(chartContentWidth, index * pointSpacing));
    const normalizedY = (point.y - minY) / yRange;
    const y = chartHeight - (normalizedY * chartHeight);
    // Ensure points stay within bounds (with small margin)
    const clampedY = Math.max(2, Math.min(chartHeight - 2, y));
    const clampedX = Math.max(2, Math.min(chartContentWidth - 2, x));
    return { x: clampedX, y: clampedY, value: point.y };
  });

  // Generate SVG path with smooth line segments (stays within bounds)
  const generatePath = () => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    // Use simple line segments - all points are already clamped to bounds
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      path += ` L ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  return (
    <View style={[styles.advancedChartContainer, { height }]}>
      {/* Y-Axis Labels */}
      <View style={[styles.yAxisContainer, { height: chartHeight, marginTop: padding.top }]}>
        {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
          const value = maxY - (i * yStep);
          const yPosition = (i * chartHeight / yAxisSteps);
          return (
            <Text 
              key={i} 
              style={[
                styles.yAxisLabel, 
                { 
                  position: 'absolute', 
                  top: yPosition - 8,
                }
              ]}
            >
              {value.toFixed(1)}{unit}
            </Text>
          );
        })}
      </View>
     
      {/* Scrollable Chart Area */}
      <View style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingRight: padding.right }}
          style={{ flex: 1 }}
        >
          <View style={[styles.advancedChartArea, { width: chartContentWidth, height: chartHeight, marginTop: padding.top }]}>
            <Svg width={chartContentWidth} height={chartHeight} style={{ position: 'absolute' }}>
              {/* Grid Lines */}
              <G>
                {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
                  const yPos = (i * chartHeight / yAxisSteps);
                  return (
                    <SvgLine
                      key={`grid-${i}`}
                      x1="0"
                      y1={yPos}
                      x2={chartContentWidth}
                      y2={yPos}
                      stroke={'#E2E8F0'}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                  );
                })}
              </G>
              
              {/* Area under the line (gradient effect) */}
              <Path
                d={`${generatePath()} L ${points[points.length - 1]?.x || 0} ${chartHeight} L 0 ${chartHeight} Z`}
                fill={color}
                opacity={0.1}
              />
              
              {/* Main Line */}
              <Path
                d={generatePath()}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data Points */}
              {points.map((point, i) => (
                <Circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill={'#FFFFFF'}
                  stroke={color}
                  strokeWidth="3"
                />
              ))}
            </Svg>
            
            {/* X-Axis Labels */}
            {showLabels && (
              <View style={styles.xAxisLabelsContainer}>
                {points.map((point, i) => {
                  // Show labels for every 5th point or first/last
                  if (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
                    let label = i.toString();
                    const customLabel = data[i]?.label;
                    if (customLabel) {
                      label = customLabel;
                    } else if (data[i]?.timestamp) {
                      const time = new Date(data[i].timestamp);
                      // If date spans many days, show date; otherwise show time
                      label = time.toLocaleDateString('en-CA');
                    }
                    return (
                      <Text
                        key={i}
                        style={[
                          styles.xAxisLabel,
                          {
                            position: 'absolute',
                            left: point.x - 20,
                            bottom: -25,
                            width: 40,
                          }
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    );
                  }
                  return null;
                })}
              </View>
            )}
          </View>
        </ScrollView>
        
        {/* X-Axis Title */}
        <View style={styles.xAxisTitleContainer}>
          <Text style={styles.xAxisTitle}>Time</Text>
        </View>
      </View>
    </View>
  );
}

interface BarChartProps {
  data: { x: number; y: number }[];
  height?: number;
  color?: string;
}

export function BarChart({ data, height = 200, color = '#F97316' }: BarChartProps) {
  const width = Dimensions.get('window').width - 40;
  const padding = { left: 40, right: 20, top: 20, bottom: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const maxY = Math.max(...data.map(d => d.y));
  const barWidth = Math.max(8, chartWidth / data.length - 4);

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.yAxis}>
        <Text style={styles.axisLabel}>{maxY.toFixed(0)}</Text>
        <Text style={styles.axisLabel}>{(maxY / 2).toFixed(0)}</Text>
        <Text style={styles.axisLabel}>0</Text>
      </View>
     
      <View style={{ flex: 1 }}>
        <View style={[styles.chartArea, { height: chartHeight, marginTop: padding.top, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }]}>
          {data.map((point, i) => {
            const barHeight = maxY > 0 ? (point.y / maxY) * chartHeight : 0;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    width: barWidth,
                    backgroundColor: color,
                  },
                ]}
              />
            );
          })}
        </View>
       
        <View style={styles.xAxis}>
          <Text style={styles.axisLabel}>0</Text>
          <Text style={styles.axisLabel}>{Math.floor(data.length / 2)}</Text>
          <Text style={styles.axisLabel}>{data.length - 1}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
  },
  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 40,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 40,
    alignItems: 'center',
  },
  axisLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  chartArea: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  point: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  line: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    position: 'absolute',
  },
  scrollableChartContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  yAxisContainer: {
    width: 50,
    position: 'relative',
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'right',
    width: 40,
  },
  scrollableChartArea: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#E2E8F0',
    opacity: 0.3,
  },
  barContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
  },
  barValueLabel: {
    fontSize: 8,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  xAxisTitleContainer: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  xAxisTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600' as const,
  },
  advancedChartContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  advancedChartArea: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  xAxisLabelsContainer: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    height: 30,
  },
});

interface CandleChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function CandleChart({ data, height = 250, color = '#F97316' }: CandleChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const padding = { left: 50, right: 20, top: 20, bottom: 90 };
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate minimum width for scrollable chart (each bar needs space)
  const minBarWidth = 20;
  const barGap = 4;
  const chartContentWidth = Math.max(screenWidth - padding.left - padding.right, data.length * (minBarWidth + barGap));
  const barWidth = Math.max(minBarWidth, (chartContentWidth / data.length) - barGap);

  if (data.length === 0) return null;

  const maxY = Math.max(...data.map(d => d.value), 1);
  const yAxisSteps = 5;
  const yStep = maxY / yAxisSteps;

  return (
    <View style={[styles.scrollableChartContainer, { height }]}>
      {/* Y-Axis Labels */}
      <View style={[styles.yAxisContainer, { height: chartHeight, marginTop: padding.top }]}>
        {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
          const value = maxY - (i * yStep);
          return (
            <Text key={i} style={[styles.yAxisLabel, { position: 'absolute', top: (i * chartHeight / yAxisSteps) - 8 }]}>
              {value.toFixed(1)}
            </Text>
          );
        })}
        <Text style={[styles.yAxisLabel, { position: 'absolute', bottom: -20, left: -40 }]}>
          Energy (kWh)
        </Text>
      </View>
     
      {/* Scrollable Chart Area */}
      <View style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingRight: padding.right }}
          style={{ flex: 1 }}
        >
          <View style={[styles.scrollableChartArea, { width: chartContentWidth, height: chartHeight, marginTop: padding.top }]}>
            {/* Grid Lines */}
            {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
              <View
                key={`grid-${i}`}
                style={[
                  styles.gridLine,
                  {
                    position: 'absolute',
                    top: (i * chartHeight / yAxisSteps),
                    width: chartContentWidth,
                  }
                ]}
              />
            ))}
            
            {/* Bars */}
            {data.map((point, i) => {
              const barHeight = maxY > 0 ? (point.value / maxY) * chartHeight : 0;
              const xPosition = i * (barWidth + barGap);
              
              return (
                <View
                  key={i}
                  style={[
                    styles.barContainer,
                    {
                      left: xPosition,
                      width: barWidth,
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        width: barWidth,
                        backgroundColor: color,
                        bottom: 0,
                      },
                    ]}
                  />
                  {/* X-Axis Labels - Show date for every bar, rotate for better fit */}
                  <Text 
                    style={[
                      styles.xAxisLabel,
                      {
                        position: 'absolute',
                        bottom: -35,
                        width: 50,
                        left: -(25 - barWidth / 2),
                        textAlign: 'center',
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {point.label}
                  </Text>
                  {/* Value label on top of bar */}
                  {barHeight > 20 && (
                    <Text
                      style={[
                        styles.barValueLabel,
                        {
                          position: 'absolute',
                          bottom: barHeight + 4,
                          width: barWidth,
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {point.value.toFixed(1)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
        
        {/* X-Axis Title */}
        <View style={styles.xAxisTitleContainer}>
          <Text style={styles.xAxisTitle}>Date</Text>
        </View>
      </View>
    </View>
  );
}