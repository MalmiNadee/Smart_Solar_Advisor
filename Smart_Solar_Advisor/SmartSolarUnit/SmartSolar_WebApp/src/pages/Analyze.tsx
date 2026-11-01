import React, { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSolarSites } from "@/hooks/useBackendAPI";
import {
  useWeatherSeasonal,
  usePredictionMonthlyBreakdown,
  useFullYearForecast,
  useFeatureImportance,
  useDailyAnalysis,
  useTimeSeriesForecast,
} from "@/hooks/useBackendAPI";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FullYearForecastChart } from "@/components/dashboard/FullYearForecastChart";
import { FeatureImportanceChart } from "@/components/dashboard/FeatureImportanceChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Calendar,
  CloudRain,
  AlertTriangle,
  BarChart3,
  Sparkles,
  Sun,
  Activity,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Analyze: React.FC = () => {
  const { sites, loading: sitesLoading } = useSolarSites();
  const runningSites = sites.filter((s) => s.status === "running");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) || runningSites[0] || sites[0],
    [sites, selectedSiteId, runningSites]
  );

  React.useEffect(() => {
    if (!selectedSiteId && selectedSite) setSelectedSiteId(selectedSite.id);
  }, [selectedSite, selectedSiteId]);

  const customerName = selectedSite?.customer_name ?? null;
  const siteId = selectedSite?.id ?? null;

  const { data: weatherSeasonal, loading: weatherLoading } = useWeatherSeasonal(
    selectedSite?.latitude,
    selectedSite?.longitude
  );
  const { data: monthlyBreakdown, loading: breakdownLoading } = usePredictionMonthlyBreakdown(
    customerName,
    siteId
  );
  const { data: fullYearForecast, loading: forecastLoading } = useFullYearForecast(
    customerName,
    siteId,
    selectedSite?.latitude,
    selectedSite?.longitude
  );
  const { data: featureImportance, loading: importanceLoading } = useFeatureImportance(
    customerName,
    siteId
  );
  const {
    data: dailyAnalysis,
    loading: dailyAnalysisLoading,
    refetch: refetchDailyAnalysis,
  } = useDailyAnalysis(
    customerName,
    siteId,
    undefined,
    true
  );
  const historyDays =
    selectedSite?.created_at
      ? Math.max(
        7,
        Math.floor(
          (new Date().getTime() - new Date(selectedSite.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
        ) + 1
      )
      : 90;
  const {
    data: timeSeriesForecast,
    loading: timeSeriesLoading,
    refetch: refetchTimeSeries,
  } = useTimeSeriesForecast(customerName, siteId, historyDays, 30, "prophet");

  const seasonalChartData = useMemo(() => {
    const weatherByMonth = new Map(
      (weatherSeasonal?.monthly || []).map((m) => [m.yearMonth, m])
    );
    return (monthlyBreakdown || []).map((p) => {
      const w = weatherByMonth.get(p.yearMonthLabel);
      return {
        month: p.yearMonthLabel,
        label: `${p.yearMonthLabel.slice(5)}/${String(p.year).slice(2)}`,
        avgTemp: w?.avgTemperature ?? null,
        solarKwh: Math.round(p.totalKwh * 1000) / 1000,
      };
    });
  }, [weatherSeasonal?.monthly, monthlyBreakdown]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seasonal Prediction</h1>
          <p className="text-muted-foreground">
            Daily energy generation and AI predictions using your realtime Firebase data.
          </p>
        </div>

        {sites.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Site:</span>
            <Select
              value={selectedSiteId || selectedSite?.id || ""}
              onValueChange={(v) => setSelectedSiteId(v)}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.site_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!selectedSite && !sitesLoading && (
          <div className="p-8 rounded-xl bg-card border border-border text-center text-muted-foreground">
            No site selected. Add a site to view analysis.
          </div>
        )}

        {selectedSite && (
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Daily
              </TabsTrigger>
              {/* <TabsTrigger value="timeseries" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Time-Series
              </TabsTrigger> */}
              <TabsTrigger value="seasonal" className="flex items-center gap-2">
                <CloudRain className="w-4 h-4" />
                Seasonal
              </TabsTrigger>
              <TabsTrigger value="forecast" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Full Year
              </TabsTrigger>
              <TabsTrigger value="importance" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Importance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-6">
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Daily Energy Generation (Realtime Collected Results)
                </h3>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Today's aggregated predictions with AI explanation from your latest sensor data.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchDailyAnalysis()}
                    disabled={dailyAnalysisLoading}
                  >
                    Refresh Daily Results
                  </Button>
                </div>
                {dailyAnalysisLoading ? (
                  <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
                    Loading realtime data...
                  </div>
                ) : !dailyAnalysis ? (
                  <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="text-sm text-muted-foreground mb-1">Date</div>
                        <div className="text-lg font-semibold text-foreground">
                          {dailyAnalysis.date || "Today"}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="text-sm text-muted-foreground mb-1">Total kWh</div>
                        <div className="text-lg font-semibold text-foreground">
                          {dailyAnalysis.totalKwh?.toFixed(4) || "0.0000"}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="text-sm text-muted-foreground mb-1">Readings</div>
                        <div className="text-lg font-semibold text-foreground">
                          {dailyAnalysis.readingsCount || 0}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="text-sm text-muted-foreground mb-1">Latest (5min)</div>
                        <div className="text-lg font-semibold text-foreground">
                          {dailyAnalysis.latestPrediction?.predictedKwh?.toFixed(4) || "N/A"}
                        </div>
                      </div>
                    </div>
                    {/* {dailyAnalysis.xaiExplanation && !dailyAnalysis.xaiExplanation.error && (
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          XAI Explanation (SHAP)
                        </h4>
                        <p className="text-sm text-foreground mb-2">
                          {dailyAnalysis.xaiExplanation.explanation_text || "No explanation available"}
                        </p>
                        {dailyAnalysis.xaiExplanation.shap_values && (
                          <div className="text-xs text-muted-foreground">
                            Feature contributions:{" "}
                            {Object.entries(dailyAnalysis.xaiExplanation.shap_values)
                              .map(([k, v]: [string, any]) => `${k}: ${v > 0 ? "+" : ""}${v.toFixed(3)}`)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    )} */}
                    {dailyAnalysis.latestPrediction?.features && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-2">Latest Features</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          {Object.entries(dailyAnalysis.latestPrediction.features).map(([k, v]: [string, any]) => (
                            <div key={k}>
                              <span className="text-muted-foreground">{k}:</span>{" "}
                              <span className="font-medium">{typeof v === "number" ? v.toFixed(2) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timeseries" className="mt-6">
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Time-Series Forecast (Prophet)
                </h3>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Forecast trained on your collected daily energy from{" "}
                    {selectedSite?.created_at || "the first available day"} up to today.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchTimeSeries()}
                    disabled={timeSeriesLoading}
                  >
                    Generate Forecast
                  </Button>
                </div>
                {timeSeriesLoading ? (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">
                    Computing Prophet forecast...
                  </div>
                ) : !timeSeriesForecast || timeSeriesForecast.error ? (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">
                    {timeSeriesForecast?.message || "Time-series forecast unavailable. Ensure Python engine is running with Prophet installed."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            ...(timeSeriesForecast.historyData || timeSeriesForecast.history || []).map((h: any) => ({
                              date: h.date,
                              value: h.value || h.totalKwh,
                              type: "history",
                            })),
                            ...(timeSeriesForecast.forecast || []).map((f: any) => ({
                              date: f.date,
                              value: f.yhat,
                              lower: f.yhat_lower,
                              upper: f.yhat_upper,
                              type: "forecast",
                            })),
                          ]}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="date"
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
                            unit=" kWh"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "0.5rem",
                              fontSize: "12px",
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Daily kWh"
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="lower"
                            name="Lower bound"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="upper"
                            name="Upper bound"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Model: {timeSeriesForecast.model || "prophet"} | History: {timeSeriesForecast.history?.length || 0} days | Forecast: {timeSeriesForecast.forecast?.length || 0} days
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="seasonal" className="mt-6">
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Sun className="w-5 h-5" />
                  Seasonal Trends (Last 12 Months)
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Monthly average temperature and predicted solar yield
                </p>
                {weatherLoading || breakdownLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    Loading…
                  </div>
                ) : seasonalChartData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No data yet
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={seasonalChartData}
                        margin={{ top: 5, right: 50, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="temp"
                          stroke="hsl(var(--chart-temperature))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          unit=" °C"
                        />
                        <YAxis
                          yAxisId="kwh"
                          orientation="right"
                          stroke="hsl(var(--chart-2))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          unit=" kWh"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                            fontSize: "12px",
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="avgTemp"
                          name="Avg temperature"
                          stroke="hsl(var(--chart-temperature))"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                        <Line
                          yAxisId="kwh"
                          type="monotone"
                          dataKey="solarKwh"
                          name="Predicted solar (kWh)"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="forecast" className="mt-6">
              <FullYearForecastChart data={fullYearForecast} loading={forecastLoading} />
            </TabsContent>

            <TabsContent value="importance" className="mt-6">
              <FeatureImportanceChart
                data={featureImportance}
                loading={importanceLoading}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analyze;
