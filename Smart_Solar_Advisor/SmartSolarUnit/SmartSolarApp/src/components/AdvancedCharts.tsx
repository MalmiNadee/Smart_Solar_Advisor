import React from 'react';
import { View, StyleSheet } from 'react-native';

// Import victory-native as any to avoid TypeScript issues with named exports
// across different library versions.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const VictoryNative: any = require('victory-native');

const {
  VictoryChart,
  VictoryLine,
  VictoryTheme,
  VictoryLegend,
  VictoryGroup,
  VictoryAxis,
  VictoryScatter,
} = VictoryNative;

type TimePoint = {
  x: Date | string;
  y: number;
};

type TimeSeriesForecastPoint = {
  date: string;
  value: number;
  lower?: number;
  upper?: number;
  type: 'history' | 'forecast';
};

interface TimeSeriesForecastChartProps {
  data: TimeSeriesForecastPoint[];
}

export const TimeSeriesForecastChart: React.FC<TimeSeriesForecastChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0) return null;

  // In the Web App, 'history' and 'forecast' central values are plotted as a single continuous line.
  const combinedData: TimePoint[] = data.map((d) => ({
    x: d.date,
    y: d.value,
  }));

  const forecastPoints = data.filter((d) => d.type === 'forecast');

  const lowerData: TimePoint[] = forecastPoints
    .filter((d) => d.lower != null)
    .map((d) => ({ x: d.date, y: d.lower as number }));

  const upperData: TimePoint[] = forecastPoints
    .filter((d) => d.upper != null)
    .map((d) => ({ x: d.date, y: d.upper as number }));

  // Connect the bounds to the last history point to make the dashed lines join the main line organically
  const historyPoints = data.filter((d) => d.type === 'history');
  if (historyPoints.length > 0 && forecastPoints.length > 0) {
    const lastHistory = historyPoints[historyPoints.length - 1];
    if (lowerData.length > 0) {
      lowerData.unshift({ x: lastHistory.date, y: lastHistory.value });
    }
    if (upperData.length > 0) {
      upperData.unshift({ x: lastHistory.date, y: lastHistory.value });
    }
  }

  return (
    <View style={styles.chartContainer}>
      <VictoryChart
        theme={VictoryTheme.material}
        padding={{ top: 20, bottom: 60, left: 60, right: 40 }}
        domainPadding={{ x: 10, y: 20 }}
      >
        <VictoryAxis
          fixLabelOverlap={true}
          tickFormat={(t: string | any[]) =>
            typeof t === 'string' ? t.slice(5) : t
          }
          style={{
            grid: { stroke: '#f1f5f9', strokeDasharray: '3,3' },
            tickLabels: { fontSize: 9, angle: -45, textAnchor: 'end' },
          }}
        />
        <VictoryAxis
          dependentAxis
          label="kWh"
          style={{
            grid: { stroke: '#f1f5f9', strokeDasharray: '3,3' },
            axisLabel: { padding: 40, fontSize: 10 },
            tickLabels: { fontSize: 10 },
          }}
        />

        {/* Combined History + Forecast central line */}
        <VictoryLine
          data={combinedData}
          style={{
            data: { stroke: '#0ea5e9', strokeWidth: 2 },
          }}
        />

        {/* Forecast lower/upper bounds as dashed lines */}
        {lowerData.length > 0 && (
          <VictoryLine
            data={lowerData}
            style={{
              data: {
                stroke: '#94a3b8',
                strokeWidth: 1,
                strokeDasharray: '5,5',
              },
            }}
          />
        )}
        {upperData.length > 0 && (
          <VictoryLine
            data={upperData}
            style={{
              data: {
                stroke: '#94a3b8',
                strokeWidth: 1,
                strokeDasharray: '5,5',
              },
            }}
          />
        )}

        <VictoryLegend
          x={40}
          y={10}
          orientation="horizontal"
          gutter={12}
          style={{
            labels: { fontSize: 10 },
          }}
          data={[
            { name: 'Daily kWh', symbol: { fill: '#0ea5e9' } },
            { name: 'Lower bound', symbol: { fill: '#94a3b8' } },
            { name: 'Upper bound', symbol: { fill: '#94a3b8' } },
          ]}
        />
      </VictoryChart>
    </View>
  );
};

interface SeasonalChartProps {
  data: { label: string; solarKwh: number; avgTemp: number | null }[];
}

export const SeasonalTrendsChart: React.FC<SeasonalChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Calculate the max for each axis with some padding (10%)
  const maxKwh = Math.max(...data.map((d) => d.solarKwh), 10) * 1.1;
  const maxTemp = Math.max(...data.map((d) => d.avgTemp ?? 0), 10) * 1.1;

  // Normalize data to a 0-1 scale so we can use a single [0, 1] domain chart
  const normalizedTemp = data.map((d) => ({
    x: d.label,
    y: Math.max(0, (d.avgTemp ?? 0) / maxTemp),
  }));
  const normalizedKwh = data.map((d) => ({
    x: d.label,
    y: Math.max(0, d.solarKwh / maxKwh),
  }));

  return (
    <View style={styles.chartContainer}>
      <VictoryChart
        theme={VictoryTheme.material}
        padding={{ top: 30, bottom: 60, left: 50, right: 60 }}
        domain={{ y: [0, 1] }}
        domainPadding={{ x: 10 }}
      >
        {/* X Axis */}
        <VictoryAxis
          fixLabelOverlap={true}
          tickValues={data.map((d) => d.label)}
          tickFormat={(t: any) => (typeof t === 'string' && t.length === 10 ? t.substring(5) : t)}
          style={{
            grid: { stroke: '#f1f5f9', strokeDasharray: '3,3' },
            tickLabels: { fontSize: 9, fill: '#64748b', angle: -45, textAnchor: 'end' },
          }}
        />

        {/* Y Axis (Left - Temperature) */}
        <VictoryAxis
          dependentAxis
          tickValues={[0, 0.25, 0.5, 0.75, 1]}
          tickFormat={(t: number) => `${Math.round(t * maxTemp)} °C`}
          style={{
            grid: { stroke: '#f1f5f9', strokeDasharray: '3,3' },
            tickLabels: { fontSize: 9, fill: '#ef4444' },
          }}
        />

        {/* Y Axis (Right - kWh) */}
        <VictoryAxis
          dependentAxis
          orientation="right"
          tickValues={[0, 0.25, 0.5, 0.75, 1]}
          tickFormat={(t: number) => `${Math.round(t * maxKwh)} kWh`}
          style={{
            tickLabels: { fontSize: 9, fill: '#334155' },
          }}
        />

        {/* Temperature line + dots */}
        <VictoryGroup>
          <VictoryLine
            data={normalizedTemp}
            style={{
              data: { stroke: '#ef4444', strokeWidth: 1.5 },
            }}
          />
          <VictoryScatter
            data={normalizedTemp}
            size={3}
            style={{
              data: { fill: '#ffffff', stroke: '#ef4444', strokeWidth: 1.5 },
            }}
          />
        </VictoryGroup>

        {/* Solar kWh line + dots */}
        <VictoryGroup>
          <VictoryLine
            data={normalizedKwh}
            style={{
              data: { stroke: '#0ea5e9', strokeWidth: 1.5 },
            }}
          />
          <VictoryScatter
            data={normalizedKwh}
            size={3}
            style={{
              data: { fill: '#ffffff', stroke: '#0ea5e9', strokeWidth: 1.5 },
            }}
          />
        </VictoryGroup>

        <VictoryLegend
          x={60}
          y={0}
          orientation="horizontal"
          gutter={12}
          symbolSpacer={6}
          style={{
            labels: { fontSize: 10, fill: '#64748b' },
          }}
          data={[
            {
              name: 'Avg temperature',
              symbol: { type: 'circle', fill: '#ffffff', stroke: '#ef4444', strokeWidth: 1.5 },
              labels: { fill: '#ef4444' }
            },
            {
              name: 'Daily result (kWh)',
              symbol: { type: 'minus', fill: 'transparent' },
              labels: { fill: '#334155' }
            },
          ]}
        />
      </VictoryChart>
    </View>
  );
};

interface FullYearForecastChartMobileProps {
  data: { label: string; solarKwh: number; temperature: number | null; confidence?: string }[];
}

export const FullYearForecastChartMobile: React.FC<
  FullYearForecastChartMobileProps
> = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Calculate the max for each axis with some padding (10%)
  const maxKwh = Math.max(...data.map((d) => d.solarKwh), 10) * 1.1;
  const maxTemp = Math.max(...data.map((d) => d.temperature ?? 0), 10) * 1.1;

  // Normalize data to a 0-1 scale so we can use a single [0, 1] domain chart
  const normalizedTemp = data.map((d) => ({
    x: d.label,
    y: Math.max(0, (d.temperature ?? 0) / maxTemp),
  }));
  const normalizedKwh = data.map((d) => ({
    x: d.label,
    y: Math.max(0, d.solarKwh / maxKwh),
  }));

  return (
    <View style={styles.chartContainer}>
      <VictoryChart
        theme={VictoryTheme.material}
        padding={{ top: 30, bottom: 60, left: 50, right: 60 }}
        domain={{ y: [0, 1] }}
        domainPadding={{ x: 10 }}
      >
        {/* X Axis */}
        <VictoryAxis
          fixLabelOverlap={true}
          tickValues={data.map((d) => d.label)}
          tickFormat={(t: any) => t}
          style={{
            grid: { stroke: '#f1f5f9', strokeDasharray: '3,3' },
            tickLabels: { fontSize: 9, fill: '#64748b', angle: -45, textAnchor: 'end' },
          }}
        />

        {/* Y Axis (Left - Temperature) */}
        <VictoryAxis
          dependentAxis
          tickValues={[0, 0.25, 0.5, 0.75, 1]}
          tickFormat={(t: number) => `${Math.round(t * maxTemp)} °C`}
          style={{
            grid: { stroke: '#f1f5f9', strokeDasharray: '3,3' },
            tickLabels: { fontSize: 9, fill: '#ef4444' },
          }}
        />

        {/* Y Axis (Right - kWh) */}
        <VictoryAxis
          dependentAxis
          orientation="right"
          tickValues={[0, 0.25, 0.5, 0.75, 1]}
          tickFormat={(t: number) => `${Math.round(t * maxKwh)} kWh`}
          style={{
            tickLabels: { fontSize: 9, fill: '#f97316' },
          }}
        />

        {/* Temperature line + dots */}
        <VictoryGroup>
          <VictoryLine
            data={normalizedTemp}
            style={{
              data: { stroke: '#ef4444', strokeWidth: 1.5 },
            }}
          />
          <VictoryScatter
            data={normalizedTemp}
            size={3}
            style={{
              data: { fill: '#ffffff', stroke: '#ef4444', strokeWidth: 1.5 },
            }}
          />
        </VictoryGroup>

        {/* Solar kWh line + dots */}
        <VictoryGroup>
          <VictoryLine
            data={normalizedKwh}
            style={{
              data: { stroke: '#f97316', strokeWidth: 1.5 },
            }}
          />
          <VictoryScatter
            data={normalizedKwh}
            size={3}
            style={{
              data: { fill: '#ffffff', stroke: '#f97316', strokeWidth: 1.5 },
            }}
          />
        </VictoryGroup>

        <VictoryLegend
          x={60}
          y={0}
          orientation="horizontal"
          gutter={12}
          symbolSpacer={6}
          style={{
            labels: { fontSize: 10, fill: '#64748b' },
          }}
          data={[
            {
              name: 'Avg temperature',
              symbol: { type: 'circle', fill: '#ffffff', stroke: '#ef4444', strokeWidth: 1.5 },
              labels: { fill: '#ef4444' }
            },
            {
              name: 'Predicted solar (kWh)',
              symbol: { type: 'minus', fill: 'transparent' },
              labels: { fill: '#334155' }
            },
          ]}
        />
      </VictoryChart>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

