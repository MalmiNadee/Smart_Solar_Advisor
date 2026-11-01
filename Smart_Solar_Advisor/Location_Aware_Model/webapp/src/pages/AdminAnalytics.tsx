import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import { fetchSitesSummary, fetchAggregateData } from "@/services/api";
import type { SiteSummary, AggregateResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const AdminAnalytics = () => {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareSite1, setCompareSite1] = useState("");
  const [compareSite2, setCompareSite2] = useState("");
  const [compareData1, setCompareData1] = useState<AggregateResponse | null>(null);
  const [compareData2, setCompareData2] = useState<AggregateResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sitesData = await fetchSitesSummary();
        setSites(sitesData);
        if (sitesData.length > 0) {
          const daily = await fetchAggregateData(sitesData[0].latitude, sitesData[0].longitude, "daily");
          setDailyData(daily);
        }
      } catch (e: any) {
        toast({ title: "API Error", description: e?.message || "Failed to load.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const dailyChart = useMemo(() => {
    if (!dailyData) return [];
    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        date: key,
        energy: +v.total_predicted_kwh_per5min.toFixed(4),
        irradiance: +v.average_irradiance.toFixed(2),
        temp: +v.average_temperature.toFixed(2),
        humidity: +v.average_humidity.toFixed(2),
        dust: +v.average_dust_level.toFixed(4),
        rainfall: +v.average_rainfall.toFixed(2),
      }));
  }, [dailyData]);

  // Site comparison using daily data
  const handleCompare = async () => {
    if (!compareSite1 || !compareSite2) return;
    const s1 = sites.find((s) => s.site === compareSite1);
    const s2 = sites.find((s) => s.site === compareSite2);
    if (!s1 || !s2) return;
    setCompareLoading(true);
    try {
      const [d1, d2] = await Promise.all([
        fetchAggregateData(s1.latitude, s1.longitude, "daily"),
        fetchAggregateData(s2.latitude, s2.longitude, "daily"),
      ]);
      setCompareData1(d1);
      setCompareData2(d2);
    } catch (e: any) {
      toast({ title: "Compare Error", description: e?.message || "Failed.", variant: "destructive" });
    } finally {
      setCompareLoading(false);
    }
  };

  const comparisonChart = useMemo(() => {
    if (!compareData1 || !compareData2) return [];
    const allKeys = new Set([...Object.keys(compareData1), ...Object.keys(compareData2)]);
    return [...allKeys].sort().map((key) => ({
      date: key,
      energy1: +(compareData1[key]?.total_predicted_kwh_per5min ?? 0).toFixed(4),
      energy2: +(compareData2[key]?.total_predicted_kwh_per5min ?? 0).toFixed(4),
      irradiance1: +(compareData1[key]?.average_irradiance ?? 0).toFixed(2),
      irradiance2: +(compareData2[key]?.average_irradiance ?? 0).toFixed(2),
      temp1: +(compareData1[key]?.average_temperature ?? 0).toFixed(2),
      temp2: +(compareData2[key]?.average_temperature ?? 0).toFixed(2),
    }));
  }, [compareData1, compareData2]);

  const comparisonRadar = useMemo(() => {
    if (!compareData1 || !compareData2) return [];
    const avg = (data: AggregateResponse, key: keyof AggregateResponse[string]) => {
      const vals = Object.values(data);
      return vals.length ? +(vals.reduce((s, v) => s + (v[key] as number), 0) / vals.length).toFixed(2) : 0;
    };
    return [
      { metric: "Energy", site1: avg(compareData1, "total_predicted_kwh_per5min"), site2: avg(compareData2, "total_predicted_kwh_per5min") },
      { metric: "Irradiance", site1: avg(compareData1, "average_irradiance"), site2: avg(compareData2, "average_irradiance") },
      { metric: "Temperature", site1: avg(compareData1, "average_temperature"), site2: avg(compareData2, "average_temperature") },
      { metric: "Humidity", site1: avg(compareData1, "average_humidity"), site2: avg(compareData2, "average_humidity") },
      { metric: "Rainfall", site1: avg(compareData1, "average_rainfall"), site2: avg(compareData2, "average_rainfall") },
    ];
  }, [compareData1, compareData2]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-solar-gold" />
        <span className="ml-3 text-muted-foreground">Loading analytics from API...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <h3 className="text-lg font-semibold text-foreground">📊 System Analytics — Daily Data</h3>

      {/* Daily Energy Bar */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Daily Energy Production (Bar)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="energy" fill="hsl(42 100% 50%)" radius={[4, 4, 0, 0]} name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Irradiance & Energy Lines + Temp/Humidity Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Irradiance & Energy (Line)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="right" type="monotone" dataKey="irradiance" stroke="hsl(42 100% 50%)" strokeWidth={2} dot={{ r: 3 }} name="Irradiance" />
              <Line yAxisId="left" type="monotone" dataKey="energy" stroke="hsl(155 70% 45%)" strokeWidth={2} dot={{ r: 3 }} name="Energy (kWh)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Temperature & Humidity (Scatter)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="date" name="Date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              <Scatter data={dailyChart} dataKey="temp" fill="hsl(220 70% 25%)" name="Temp (°C)" />
              <Scatter data={dailyChart} dataKey="humidity" fill="hsl(200 80% 55%)" name="Humidity (%)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dust & Rainfall scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Dust Level (Daily Dots)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis dataKey="dust" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={dailyChart} fill="hsl(36 100% 55%)" name="Dust Level" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Rainfall (Daily Dots)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis dataKey="rainfall" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={dailyChart} fill="hsl(200 80% 55%)" name="Rainfall (mm)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Site Comparison */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">🔄 Site Comparison (Daily)</h4>
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Site 1</span>
            <Select value={compareSite1} onValueChange={setCompareSite1}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (<SelectItem key={s.site} value={s.site}>{s.site} ({s.customer})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Site 2</span>
            <Select value={compareSite2} onValueChange={setCompareSite2}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (<SelectItem key={s.site} value={s.site}>{s.site} ({s.customer})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCompare} disabled={!compareSite1 || !compareSite2 || compareLoading}>
            {compareLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Compare
          </Button>
        </div>

        {comparisonChart.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Energy Comparison (Bar)</h5>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="energy1" fill="hsl(42 100% 50%)" name={compareSite1} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="energy2" fill="hsl(220 70% 25%)" name={compareSite2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Parameter Radar (Averages)</h5>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={comparisonRadar}>
                  <PolarGrid stroke="hsl(214 20% 85%)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar dataKey="site1" stroke="hsl(42 100% 50%)" fill="hsl(42 100% 50% / 0.2)" fillOpacity={0.5} name={compareSite1} />
                  <Radar dataKey="site2" stroke="hsl(220 70% 25%)" fill="hsl(220 70% 25% / 0.2)" fillOpacity={0.5} name={compareSite2} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Temperature Comparison (Line)</h5>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={comparisonChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="temp1" stroke="hsl(42 100% 50%)" strokeWidth={2} dot={{ r: 3 }} name={`${compareSite1} Temp`} />
                  <Line type="monotone" dataKey="temp2" stroke="hsl(220 70% 25%)" strokeWidth={2} dot={{ r: 3 }} name={`${compareSite2} Temp`} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Irradiance Comparison (Area)</h5>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={comparisonChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="irradiance1" stroke="hsl(42 100% 50%)" fill="hsl(42 100% 50% / 0.15)" name={`${compareSite1} Irradiance`} />
                  <Area type="monotone" dataKey="irradiance2" stroke="hsl(220 70% 25%)" fill="hsl(220 70% 25% / 0.15)" name={`${compareSite2} Irradiance`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Daily Summary Table */}
      <div className="card-solar overflow-x-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📋 Daily Summary Table</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-3 font-semibold text-foreground">Date</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Energy (kWh)</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Irradiance</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Temp (°C)</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Humidity (%)</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Dust</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Rainfall</th>
            </tr>
          </thead>
          <tbody>
            {dailyChart.map((row, i) => (
              <tr key={row.date} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                <td className="py-2 px-3 font-medium text-foreground">{row.date}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.energy}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.irradiance}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.temp}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.humidity}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.dust}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.rainfall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAnalytics;
