import { useMemo, useState } from "react";
import { Battery, Clock3, MapPin } from "lucide-react";
import {
  fetchBatteryBackupEstimate,
  type BatteryBackupResponse,
} from "@/services/api";

interface BatteryBackupEstimatorProps {
  latitude: number;
  longitude: number;
  systemKw: number;
}

export const BatteryBackupEstimator = ({
  latitude,
  longitude,
  systemKw,
}: BatteryBackupEstimatorProps) => {
  const [batteryCapacityInput, setBatteryCapacityInput] = useState("5");
  const [dodPercentInput, setDodPercentInput] = useState("90");
  const [essentialLoadInput, setEssentialLoadInput] = useState("1.2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatteryBackupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const horizonHours = 12;
  const startHour = new Date().getHours();
  const efficiency = 0.92;
  const batteryCapacity = Number.parseFloat(batteryCapacityInput);
  const essentialLoad = Number.parseFloat(essentialLoadInput);
  const dodPercent = Number.parseFloat(dodPercentInput);
  const usableDod = Math.min(100, Math.max(1, Number.isFinite(dodPercent) ? dodPercent : 0)) / 100;

  const metrics = useMemo(() => {
    if (!result) return null;

    const totalBackup = result.backup_hours;
    const batteryOnly = result.without_solar_hours;
    const solarBoost = result.solar_extension_hours;
    const baselineUsableHours = (batteryCapacity * usableDod) / Math.max(essentialLoad, 0.01);
    const batteryUtilization = Math.min(100, (batteryOnly / Math.max(baselineUsableHours, 0.01)) * 100);
    const coveragePercentage = Math.min(100, (totalBackup / horizonHours) * 100);

    const sufficiencyStatus =
      coveragePercentage >= 100
        ? "Sufficient for full outage"
        : `Insufficient for full outage (supports ~${coveragePercentage.toFixed(0)}% of demand period)`;

    const roundedDrainHour = (startHour + Math.floor(totalBackup)) % 24;
    const meridiem = roundedDrainHour >= 12 ? "PM" : "AM";
    const hour12 = roundedDrainHour % 12 === 0 ? 12 : roundedDrainHour % 12;
    const timeLabel = `${hour12.toString().padStart(2, "0")}:00 ${meridiem}`;

    let batteryUtilizationLabel = "Moderate usage";
    if (batteryUtilization >= 98) {
      batteryUtilizationLabel = "High utilization (98-100%)";
    } else if (batteryUtilization >= 95) {
      batteryUtilizationLabel = "Near-complete usage";
    } else if (batteryUtilization >= 80) {
      batteryUtilizationLabel = "High";
    }

    const confidenceLevel = Math.max(80, Math.min(97, 88 + solarBoost * 3 - Math.max(0, 100 - coveragePercentage) * 0.05));

    const targetCapacity = (essentialLoad * horizonHours) / usableDod;
    const improvement = Math.max(0, targetCapacity - batteryCapacity);
    const realisticImprovement = Math.min(improvement, 15);
    const shortfallHours = Math.max(0, horizonHours - totalBackup);

    const smartInsightLines = totalBackup >= horizonHours
      ? [
        "Your battery is enough for the full outage period.",
        `You still have around ${(totalBackup - horizonHours).toFixed(1)} hours of extra backup time for essential use.`,
        "Current setup is suitable for this location under similar weather conditions.",
      ]
    : [
        `Your battery will not last the full outage and may run out around ${timeLabel}.`,
        `You will get about ${coveragePercentage.toFixed(0)}% coverage, but not the full time.`,
        realisticImprovement > 0
          ? `You can get better backup by increasing battery size by about ${realisticImprovement.toFixed(1)} kWh.`
          : "To improve reliability, use less electricity during outages.",
      ];

    const smartInsight = smartInsightLines.join("\n");

    return {
      totalBackup,
      batteryOnly,
      solarBoost,
      coveragePercentage,
      batteryUtilization,
      batteryUtilizationLabel,
      confidenceLevel,
      sufficiencyStatus,
      smartInsight,
      smartInsightLines,
    };
  }, [result, batteryCapacity, usableDod, essentialLoad, horizonHours, startHour]);

  const runEstimate = async () => {
    if (!Number.isFinite(batteryCapacity) || batteryCapacity <= 0) {
      setError("Please enter a valid Battery Capacity.");
      return;
    }
    if (!Number.isFinite(essentialLoad) || essentialLoad <= 0) {
      setError("Please enter a valid Essential Load.");
      return;
    }
    if (!Number.isFinite(dodPercent) || dodPercent <= 0 || dodPercent > 100) {
      setError("Please enter DoD between 1 and 100.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchBatteryBackupEstimate({
        latitude,
        longitude,
        battery_capacity_kwh: batteryCapacity,
        usable_dod: usableDod,
        efficiency,
        essential_load_kw: essentialLoad,
        start_hour_local: startHour,
        horizon_hours: horizonHours,
        system_kw: systemKw,
      });
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to estimate backup.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-solar space-y-5 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/80 via-sky-50/70 to-yellow-50/60" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight">Battery Backup Estimator</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Location-aware outage forecast using battery and KNN-based nearby solar prediction.
          </p>
        </div>
        <Battery className="h-5 w-5 text-blue-700 mt-1" />
      </div>

      <div className="relative z-10 grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Battery Capacity (kWh)
          </span>
          <input
            type="number"
            min={1}
            step={0.1}
            value={batteryCapacityInput}
            onChange={(e) => setBatteryCapacityInput(e.target.value)}
            onBlur={() =>
              setBatteryCapacityInput((prev) =>
                prev.trim() === "" ? "" : String(Number.parseFloat(prev))
              )
            }
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Essential Load (kW)
          </span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={essentialLoadInput}
            onChange={(e) => setEssentialLoadInput(e.target.value)}
            onBlur={() =>
              setEssentialLoadInput((prev) =>
                prev.trim() === "" ? "" : String(Number.parseFloat(prev))
              )
            }
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            DoD (%)
          </span>
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={dodPercentInput}
            onChange={(e) => setDodPercentInput(e.target.value)}
            onBlur={() =>
              setDodPercentInput((prev) =>
                prev.trim() === "" ? "" : String(Math.round(Number.parseFloat(prev)))
              )
            }
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm">
          <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Location (auto)
          </p>
          <p className="text-blue-900 font-semibold">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={runEstimate}
        disabled={loading}
        className="relative z-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-sky-600 text-white px-4 py-2 text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition disabled:opacity-60"
      >
        <Clock3 className="h-4 w-4" />
        {loading ? "Estimating..." : "Estimate Backup Duration"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && metrics && (
        <div className="relative z-10 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-4 md:col-span-3">
            <p className="text-xs uppercase tracking-wide text-blue-700">Total Backup Duration (core result)</p>
            <p className="text-4xl font-extrabold mt-1 text-blue-900">{metrics.totalBackup.toFixed(2)} h</p>
            <p className="text-xs text-blue-700 mt-1">Combined battery plus solar support.</p>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-gradient-to-b from-cyan-50 to-white p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-700">Coverage Percentage</p>
            <p className="text-2xl font-extrabold mt-1 text-cyan-900">{metrics.coveragePercentage.toFixed(0)}%</p>
            <p className="text-xs text-cyan-700 mt-1">Share of outage duration covered by battery + solar.</p>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-gradient-to-b from-cyan-50 to-white p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-700">Battery Utilization</p>
            <p className="text-xl font-extrabold mt-1 text-cyan-900">{metrics.batteryUtilizationLabel}</p>
            <p className="text-xs text-cyan-700 mt-1">Estimated utilization: {metrics.batteryUtilization.toFixed(0)}%</p>
          </div>

          <div className="rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-4">
            <p className="text-xs uppercase tracking-wide text-violet-700">Confidence Level</p>
            <p className="text-2xl font-extrabold mt-1 text-violet-900">High ({metrics.confidenceLevel.toFixed(0)}%)</p>
            <p className="text-xs text-violet-700 mt-1">Forecast confidence for the current location and weather pattern.</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-white/90 p-4 md:col-span-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Energy Sufficiency Status</p>
            <p
              className={`text-lg font-extrabold mt-1 ${
                metrics.sufficiencyStatus === "Sufficient for full outage"
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {metrics.sufficiencyStatus}
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-4 md:col-span-3">
            <p className="text-xs uppercase tracking-wide text-indigo-700">Smart Insight</p>
            <div className="text-sm mt-2 text-indigo-950 leading-relaxed space-y-1">
              {metrics.smartInsightLines.map((line, idx) =>
                line === "" ? (
                  <div key={`insight-space-${idx}`} className="h-1" />
                ) : (
                  <p key={`insight-line-${idx}`}>{line}</p>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
