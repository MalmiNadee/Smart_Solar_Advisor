import { Thermometer, Droplets, Sun, Wind, CloudRain, Zap, MapPin, Ruler } from "lucide-react";
import { KPICard } from "./KPICard";
import { MapPicker } from "./MapPicker";
import type { SolarRecord } from "@/services/api";

export const NearestDataCards = ({ record }: { record: SolarRecord }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-foreground">🛰️ Nearest Site Data</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}</span>
          <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> Panel: {record.panel_area_m2} m²</span>
          <span>📅 {record.date} · {record.time}</span>
        </div>
      </div>

      {/* Map showing site location */}
      <div className="card-solar p-0 overflow-hidden">
        <MapPicker
          lat={record.latitude}
          lng={record.longitude}
          onLocationSelect={() => {}}
          height="280px"
          readonly
          markers={[{ lat: record.latitude, lng: record.longitude, label: `<b>Nearest Site</b><br>${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}<br>Energy: ${record.predicted_kwh_per5min} kWh/5min` }]}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Temperature" value={record.temperature} unit="°C" icon={Thermometer} color="gold" />
        <KPICard title="Humidity" value={record.humidity} unit="%" icon={Droplets} color="sky" />
        <KPICard title="Irradiance" value={record.irradiance} unit="W/m²" icon={Sun} color="gold" />
        <KPICard title="Dust Level" value={record.dust_level} icon={Wind} color="blue" />
        <KPICard title="Rainfall" value={record.rainfall} unit="mm" icon={CloudRain} color="sky" />
        <KPICard title="Predicted kWh" value={record.predicted_kwh_per5min} unit="kWh" icon={Zap} color="green" />
      </div>

      {/* Detailed Record Table */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📋 Full Record Detail</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {[
            { label: "Date", value: record.date },
            { label: "Time", value: record.time },
            { label: "Latitude", value: record.latitude.toFixed(6) },
            { label: "Longitude", value: record.longitude.toFixed(6) },
            { label: "Panel Area", value: `${record.panel_area_m2} m²` },
            { label: "Temperature", value: `${record.temperature} °C` },
            { label: "Humidity", value: `${record.humidity} %` },
            { label: "Irradiance", value: `${record.irradiance} W/m²` },
            { label: "Dust Level", value: `${record.dust_level}` },
            { label: "Rainfall", value: `${record.rainfall} mm` },
            { label: "Predicted kWh/5min", value: `${record.predicted_kwh_per5min} kWh` },
          ].map((item, i) => (
            <div key={item.label} className={`flex justify-between py-2.5 px-4 ${i % 2 === 0 ? "bg-muted/30" : ""} border-b border-border/50`}>
              <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
