import React, { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSolarSites } from "@/hooks/useBackendAPI";
import { explainabilityAPI } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const XAIInsights: React.FC = () => {
  const { sites, loading: sitesLoading } = useSolarSites();
  const runningSites = sites.filter((s) => s.status === "running");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<{
    summaryText: string;
    daysAnalyzed: number;
    lowDaysCount: number;
    lowPredictionDays: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) || runningSites[0] || sites[0],
    [sites, selectedSiteId, runningSites]
  );

  React.useEffect(() => {
    if (!selectedSiteId && selectedSite) setSelectedSiteId(selectedSite.id);
  }, [selectedSite, selectedSiteId]);

  const customerName = selectedSite?.customer_name ?? null;
  const siteId = selectedSite?.id ?? null;

  const handleGenerate = async () => {
    if (!customerName || !siteId) return;
    setLoadingSummary(true);
    setError(null);
    try {
      // Let backend decide how many days to analyze based on created_at
      const res = await explainabilityAPI.getGlobalXaiSummary(customerName, siteId);
      setSummary({
        summaryText: res.summaryText,
        daysAnalyzed: res.daysAnalyzed,
        lowDaysCount: res.lowDaysCount,
        lowPredictionDays: res.lowPredictionDays || [],
      });
    } catch (e: any) {
      setError(e.message || "Failed to generate XAI summary");
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Explainable AI Summary</h1>
          <p className="text-muted-foreground">
            Generate a text explanation using up to 30 days of collected energy predictions from Firebase –
            understand why some days had minimal generation (irradiance, rain, heat, dust, and more).
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
            No site selected. Add a site to view XAI insights.
          </div>
        )}

        {selectedSite && (
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Global Explainable AI (XAI) Result
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Uses up to 30 days of collected prediction data (since site creation) to explain why some days
                    had low energy generation.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                disabled={loadingSummary || !customerName || !siteId}
              >
                {loadingSummary ? "Generating..." : "Generate XAI Result"}
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/40 text-sm text-destructive">
                {error}
              </div>
            )}

            {loadingSummary && !summary && !error && (
              <div className="min-h-[160px] flex items-center justify-center text-muted-foreground">
                Generating explainable AI summary from Firebase data...
              </div>
            )}

            {!loadingSummary && summary && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Days analyzed: {summary.daysAnalyzed} · Low-generation days: {summary.lowDaysCount}
                  </p>
                  <div className="p-4 rounded-lg bg-muted/40 border border-border text-sm text-foreground whitespace-pre-wrap">
                    {summary.summaryText}
                  </div>
                </div>

                {summary.lowPredictionDays && summary.lowPredictionDays.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Low-generation days (detailed explanation)
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {summary.lowPredictionDays.map((day: any) => (
                        <div
                          key={day.date}
                          className="p-4 rounded-lg bg-muted/30 border border-border space-y-2 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-foreground">{day.date}</div>
                            <div className="text-xs text-muted-foreground">
                              {day.predictedKwh.toFixed(2)} kWh (
                              {day.percentage}% of average)
                            </div>
                          </div>
                          <p className="text-foreground whitespace-pre-wrap">
                            {day.explanationText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!loadingSummary && !summary && !error && (
              <div className="min-h-[120px] flex items-center justify-center text-muted-foreground text-sm text-center">
                Click &quot;Generate XAI Result&quot; to produce a natural-language explanation using up to 30 days of
                collected prediction data from Firebase.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default XAIInsights;

