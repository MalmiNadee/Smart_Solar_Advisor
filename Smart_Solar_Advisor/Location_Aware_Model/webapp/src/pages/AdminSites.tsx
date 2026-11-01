import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchSitesSummary, fetchNearestLocation } from "@/services/api";
import type { SiteSummary, SolarRecord } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { MapPicker } from "@/components/MapPicker";

interface SiteRow extends SiteSummary {
  temperature?: number;
  predicted_kwh?: number;
}

type SortKey = "customer" | "site" | "latitude" | "longitude" | "first_date" | "temperature" | "predicted_kwh";

const AdminSites = () => {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("customer");
  const [sortAsc, setSortAsc] = useState(true);
  const { toast } = useToast();
  const perPage = 10;

  const loadSites = async () => {
    setLoading(true);
    try {
      const summaries = await fetchSitesSummary();
      const enriched: SiteRow[] = await Promise.all(
        summaries.map(async (s) => {
          try {
            const records = await fetchNearestLocation(s.latitude, s.longitude);
            const r = records?.[0];
            return { ...s, temperature: r?.temperature, predicted_kwh: r?.predicted_kwh_per5min };
          } catch { return { ...s }; }
        })
      );
      setSites(enriched);
    } catch (e: any) {
      toast({ title: "API Error", description: e?.message || "Failed to load sites.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSites(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sites
      .filter((s) => s.customer.toLowerCase().includes(q) || s.site.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
        return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
  }, [sites, search, sortKey, sortAsc]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const mapMarkers = useMemo(() => sites.map(s => ({
    lat: s.latitude,
    lng: s.longitude,
    label: `<b>${s.site}</b><br>${s.customer}`,
  })), [sites]);

  const headers: { key: SortKey; label: string }[] = [
    { key: "customer", label: "Customer" },
    { key: "site", label: "Site" },
    { key: "latitude", label: "Latitude" },
    { key: "longitude", label: "Longitude" },
    { key: "first_date", label: "First Date" },
    { key: "temperature", label: "Temp (°C)" },
    { key: "predicted_kwh", label: "Predicted kWh/5min" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-solar-gold" />
        <span className="ml-3 text-muted-foreground">Loading sites from API...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Map */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📍 All Site Locations</h4>
        <div className="rounded-xl overflow-hidden border border-border">
          <MapPicker lat={null} lng={null} onLocationSelect={() => {}} height="350px" readonly markers={mapMarkers} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers or sites..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Button variant="outline" size="sm" onClick={loadSites}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="card-solar overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {headers.map((h) => (
                  <th key={h.key} className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort(h.key)}>
                    <span className="flex items-center gap-1">{h.label}<ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No sites found.</td></tr>
              ) : (
                paged.map((s) => (
                  <tr key={s.site} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.customer}</td>
                    <td className="px-4 py-3">{s.site}</td>
                    <td className="px-4 py-3 tabular-nums">{s.latitude.toFixed(4)}</td>
                    <td className="px-4 py-3 tabular-nums">{s.longitude.toFixed(4)}</td>
                    <td className="px-4 py-3">{s.first_date}</td>
                    <td className="px-4 py-3 tabular-nums">{s.temperature?.toFixed(1) ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{s.predicted_kwh?.toFixed(4) ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/sites/${s.site}`}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSites;
