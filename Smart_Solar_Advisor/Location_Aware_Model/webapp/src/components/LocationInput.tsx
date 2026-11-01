import { useState, useEffect, useRef } from "react";
import { MapPin, Search, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPicker } from "./MapPicker";

interface LocationInputProps {
  onSearch: (lat: number, lng: number, systemKw: number) => void;
  loading?: boolean;
}

export const LocationInput = ({ onSearch, loading }: LocationInputProps) => {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [systemKw, setSystemKw] = useState("5");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const kw = parseFloat(systemKw) || 5;
  const isValid = lat !== "" && lng !== "" && !isNaN(Number(lat)) && !isNaN(Number(lng)) && kw > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchLocation = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Error searching location:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchLocation();
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(String(newLat));
    setLng(String(newLng));
  };

  const handleSelectLocation = (result: any) => {
    setLat(result.lat);
    setLng(result.lon);
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  return (
    <div className="card-solar">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-solar-gold" />
        <h3 className="text-lg font-semibold text-foreground">Select Location</h3>
      </div>

      <div className="mb-4 relative" ref={searchRef}>
        <div className="relative">
          <Input
            placeholder="Search for a location (e.g. Colombo, Sri Lanka)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className="pl-10 h-11"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute z-[1000] w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((result: any, index: number) => (
              <div
                key={index}
                className="p-3 hover:bg-muted cursor-pointer flex items-start gap-2 border-b border-border last:border-0 transition-colors"
                onClick={() => handleSelectLocation(result)}
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-sm">{result.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 rounded-xl overflow-hidden border border-border">
        <MapPicker
          lat={lat ? Number(lat) : null}
          lng={lng ? Number(lng) : null}
          onLocationSelect={handleMapClick}
          height="350px"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="lat">Latitude</Label>
          <Input id="lat" type="number" step="any" placeholder="e.g. 6.87" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lng">Longitude</Label>
          <Input id="lng" type="number" step="any" placeholder="e.g. 79.99" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="systemKw">System Size (kW)</Label>
          <div className="relative">
            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="systemKw" type="number" step="any" min="1" placeholder="e.g. 5" value={systemKw} onChange={(e) => setSystemKw(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Button onClick={() => onSearch(Number(lat), Number(lng), kw)} disabled={!isValid || loading} className="h-10">
          <Search className="mr-2 h-4 w-4" /> Analyze Location
        </Button>
      </div>
    </div>
  );
};
