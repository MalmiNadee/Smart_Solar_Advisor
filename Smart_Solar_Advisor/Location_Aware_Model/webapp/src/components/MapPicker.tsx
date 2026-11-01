import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
  markers?: { lat: number; lng: number; label?: string }[];
  readonly?: boolean;
}

export const MapPicker = ({ lat, lng, onLocationSelect, height = "300px", markers = [], readonly = false }: MapPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const additionalMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([lat ?? 7.8731, lng ?? 80.7718], lat ? 12 : 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    if (!readonly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onLocationSelect(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update selected marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (lat !== null && lng !== null) {
      const selectedIcon = L.icon({
        iconUrl: markerIcon,
        iconRetinaUrl: markerIcon2x,
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      markerRef.current = L.marker([lat, lng], { icon: selectedIcon })
        .addTo(map)
        .bindPopup(`<b>Selected</b><br>Lat: ${lat}<br>Lng: ${lng}`)
        .openPopup();
      map.setView([lat, lng], Math.max(map.getZoom(), 10));
    }
  }, [lat, lng]);

  // Update additional markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    additionalMarkersRef.current.forEach((m) => m.remove());
    additionalMarkersRef.current = [];

    const siteIcon = L.divIcon({
      className: "custom-site-marker",
      html: `<div style="background:hsl(42,100%,50%);width:14px;height:14px;border-radius:50%;border:2px solid hsl(220,70%,25%);box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: siteIcon })
        .addTo(map)
        .bindPopup(m.label || `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`);
      additionalMarkersRef.current.push(marker);
    });
  }, [markers]);

  return <div ref={mapRef} style={{ height, width: "100%", borderRadius: "0.75rem", zIndex: 0 }} />;
};
