import { useState, useEffect, useMemo } from "react";
import { Zap, Users, Activity, Sun, Thermometer, Droplets, Loader2 } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { MapPicker } from "@/components/MapPicker";
import { DailyCharts } from "@/components/DailyCharts";
import { fetchSitesSummary, fetchAggregateData } from "@/services/api";
import type { SiteSummary, AggregateResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [sampleSiteLabel, setSampleSiteLabel] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sitesData = await fetchSitesSummary();
        setSites(sitesData);
        if (sitesData.length > 0) {
          const first = sitesData[0];
          setSampleSiteLabel(`${first.site} (${first.customer})`);
          const daily = await fetchAggregateData(first.latitude, first.longitude, "daily");
          setDailyData(daily);
        } else {
          setSampleSiteLabel(null);
          setDailyData(null);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load data.";
        toast({ title: "API Error", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = useMemo(() => {
    if (!dailyData) return [];
    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        energy: +v.total_predicted_kwh_per5min.toFixed(4),
        irradiance: +v.average_irradiance.toFixed(2),
        temp: +v.average_temperature.toFixed(2),
        humidity: +v.average_humidity.toFixed(2),
      }));
  }, [dailyData]);

  const totals = useMemo(() => {
    if (!chartData.length) return { totalEnergy: 0, avgIrradiance: 0, avgTemp: 0, avgHumidity: 0 };
    const totalEnergy = chartData.reduce((s, d) => s + d.energy, 0);
    const avgIrradiance = chartData.reduce((s, d) => s + d.irradiance, 0) / chartData.length;
    const avgTemp = chartData.reduce((s, d) => s + d.temp, 0) / chartData.length;
    const avgHumidity = chartData.reduce((s, d) => s + d.humidity, 0) / chartData.length;
    return {
      totalEnergy: +totalEnergy.toFixed(2),
      avgIrradiance: +avgIrradiance.toFixed(2),
      avgTemp: +avgTemp.toFixed(2),
      avgHumidity: +avgHumidity.toFixed(2),
    };
  }, [chartData]);

  const uniqueCustomers = useMemo(() => new Set(sites.map((s) => s.customer)).size, [sites]);

  const kpiEnergyTitle = sites.length > 1 ? "Energy (1st site)" : "Total Energy";
  const kpiIrrTitle = sites.length > 1 ? "Avg Irradiance · sample" : "Avg Irradiance";
  const kpiTempTitle = sites.length > 1 ? "Avg Temp · sample" : "Avg Temperature";
  const kpiHumTitle = sites.length > 1 ? "Avg Humidity · sample" : "Avg Humidity";

  const mapMarkers = useMemo(
    () =>
      sites.map((s) => ({
        lat: s.latitude,
        lng: s.longitude,
        label: `<b>${s.site}</b><br>${s.customer}<br>${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`,
      })),
    [sites]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-solar-gold" />
        <span className="ml-3 text-muted-foreground">Loading system data from API...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Sites" value={sites.length} icon={Activity} color="blue" />
        <KPICard title="Total Customers" value={uniqueCustomers} icon={Users} color="green" />
        <KPICard title={kpiEnergyTitle} value={totals.totalEnergy} unit="kWh" icon={Zap} color="gold" />
        <KPICard title={kpiIrrTitle} value={totals.avgIrradiance} unit="W/m²" icon={Sun} color="gold" />
        <KPICard title={kpiTempTitle} value={totals.avgTemp} unit="°C" icon={Thermometer} color="sky" />
        <KPICard title={kpiHumTitle} value={totals.avgHumidity} unit="%" icon={Droplets} color="sky" />
      </div>

      {sites.length > 1 && sampleSiteLabel && (
        <p className="text-xs text-muted-foreground">
          Sample KPIs and daily charts use the first registered site: <span className="font-medium text-foreground">{sampleSiteLabel}</span>. Open any site for its own analytics.
        </p>
      )}

      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📍 Customer Site Locations</h4>
        <div className="rounded-xl overflow-hidden border border-border">
          <MapPicker
            lat={null}
            lng={null}
            onLocationSelect={() => {}}
            height="400px"
            readonly
            markers={mapMarkers}
          />
        </div>
      </div>

      {dailyData && <DailyCharts data={dailyData} />}

      <div className="card-solar overflow-x-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📍 All Registered Sites</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 font-semibold text-foreground">Customer</th>
              <th className="text-left py-3 px-3 font-semibold text-foreground">Site</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Latitude</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Longitude</th>
              <th className="text-left py-3 px-3 font-semibold text-foreground">First Date</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s, i) => (
              <tr key={`${s.customer}-${s.site}`} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                <td className="py-2.5 px-3 font-medium text-foreground">{s.customer}</td>
                <td className="py-2.5 px-3">{s.site}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{s.latitude.toFixed(4)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{s.longitude.toFixed(4)}</td>
                <td className="py-2.5 px-3">{s.first_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
