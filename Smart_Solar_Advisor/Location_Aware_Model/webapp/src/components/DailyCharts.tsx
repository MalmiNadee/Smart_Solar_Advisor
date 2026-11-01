import { useMemo } from "react";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { AggregateResponse } from "@/services/api";

interface DailyChartsProps {
  data: AggregateResponse;
  scaleFactor?: number;
  systemKw?: number;
}

export const DailyCharts = ({ data, scaleFactor = 1, systemKw = 5 }: DailyChartsProps) => {
  const chartData = useMemo(
    () =>
      Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({
          name: key,
          energy: +(v.total_predicted_kwh_per5min * scaleFactor).toFixed(4),
          irradiance: +v.average_irradiance.toFixed(2),
          temp: +v.average_temperature.toFixed(2),
          humidity: +v.average_humidity.toFixed(2),
          dust: +v.average_dust_level.toFixed(4),
          rainfall: +v.average_rainfall.toFixed(2),
        })),
    [data, scaleFactor]
  );

  const stats = useMemo(() => {
    const totalEnergy = chartData.reduce((s, d) => s + d.energy, 0);
    const avgTemp = chartData.reduce((s, d) => s + d.temp, 0) / (chartData.length || 1);
    const avgHumidity = chartData.reduce((s, d) => s + d.humidity, 0) / (chartData.length || 1);
    const avgIrradiance = chartData.reduce((s, d) => s + d.irradiance, 0) / (chartData.length || 1);
    const avgDust = chartData.reduce((s, d) => s + d.dust, 0) / (chartData.length || 1);
    const avgRainfall = chartData.reduce((s, d) => s + d.rainfall, 0) / (chartData.length || 1);
    return {
      totalEnergy: +totalEnergy.toFixed(4),
      avgTemp: +avgTemp.toFixed(2),
      avgHumidity: +avgHumidity.toFixed(2),
      avgIrradiance: +avgIrradiance.toFixed(2),
      avgDust: +avgDust.toFixed(4),
      avgRainfall: +avgRainfall.toFixed(2),
    };
  }, [chartData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Daily irradiance and energy</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="right" type="monotone" dataKey="irradiance" stroke="hsl(42 100% 50%)" strokeWidth={2} dot={{ r: 3 }} name="Irradiance (W/m²)" />
            <Line yAxisId="left" type="monotone" dataKey="energy" stroke="hsl(155 70% 45%)" strokeWidth={2} dot={{ r: 3 }} name="Energy (kWh)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card-solar overflow-x-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Daily data</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-semibold text-foreground">Date</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Energy (kWh)</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Temp (°C)</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Humidity (%)</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Irradiance (W/m²)</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Dust</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Rainfall (mm)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={row.name} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                <td className="py-2 px-2 font-medium text-foreground">{row.name}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.energy}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.temp}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.humidity}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.irradiance}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.dust}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.rainfall}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2.5 px-2 text-foreground">
                Summary ({chartData.length} days){systemKw !== 5 ? ` · ${systemKw} kW` : ""}
              </td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.totalEnergy}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgTemp}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgHumidity}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgIrradiance}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgDust}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgRainfall}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
