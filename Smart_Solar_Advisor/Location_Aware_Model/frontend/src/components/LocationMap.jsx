import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/LocationMap.css";

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function LocationMarker({ position, onPositionChange }) {
  const [markerPosition, setMarkerPosition] = useState(position || [7.2, 80.0]);

  useEffect(() => {
    if (position) {
      setMarkerPosition(position);
    }
  }, [position]);

  useMapEvents({
    click(e) {
      // Ensure correct order: lat, lon
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;

      // Validate coordinates
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        const newPos = [lat, lon];
        setMarkerPosition(newPos);
        onPositionChange(lat, lon);
      }
    },
  });

  return (
    <Marker
      position={markerPosition}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const lat = e.target.getLatLng().lat;
          const lon = e.target.getLatLng().lng;

          // Validate coordinates
          if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            const newPos = [lat, lon];
            setMarkerPosition(newPos);
            onPositionChange(lat, lon);
          }
        },
      }}
    />
  );
}

function LocationMap({
  latitude,
  longitude,
  onLocationChange,
  height = "400px",
}) {
  // Ensure proper coordinate order: [latitude, longitude]
  // Round to 4 decimal places for display
  const initialLat =
    latitude && !isNaN(latitude) && latitude >= -90 && latitude <= 90
      ? Math.round(latitude * 10000) / 10000
      : 7.2;
  const initialLon =
    longitude && !isNaN(longitude) && longitude >= -180 && longitude <= 180
      ? Math.round(longitude * 10000) / 10000
      : 80.0;

  const [mapPosition, setMapPosition] = useState([initialLat, initialLon]);
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLon, setSelectedLon] = useState(initialLon);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    // Validate and set coordinates properly
    const defaultLat = 7.2;
    const defaultLon = 80.0;
    const validLat =
      latitude && !isNaN(latitude) && latitude >= -90 && latitude <= 90
        ? latitude
        : defaultLat;
    const validLon =
      longitude && !isNaN(longitude) && longitude >= -180 && longitude <= 180
        ? longitude
        : defaultLon;

    // Only update if coordinates are actually different and valid
    if (
      Math.abs(validLat - selectedLat) > 0.0001 ||
      Math.abs(validLon - selectedLon) > 0.0001
    ) {
      setMapPosition([validLat, validLon]);
      setSelectedLat(validLat);
      setSelectedLon(validLon);
    }
  }, [latitude, longitude, selectedLat, selectedLon]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handlePositionChange = (lat, lon) => {
    // Round coordinates to 4 decimal places
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    setSelectedLat(roundedLat);
    setSelectedLon(roundedLon);
    if (onLocationChange) {
      onLocationChange(roundedLat, roundedLon);
    }
  };

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // Validate coordinates from geolocation
          if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            setMapPosition([lat, lon]);
            setSelectedLat(lat);
            setSelectedLon(lon);
            if (onLocationChange) {
              onLocationChange(lat, lon);
            }
          } else {
            alert("Invalid coordinates received from geolocation.");
          }
        },
        (error) => {
          alert(
            "Unable to get your location. Please select manually on the map."
          );
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const searchLocation = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use OpenStreetMap Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&countrycodes=lk&accept-language=en`,
        {
          headers: {
            "User-Agent": "SolarAdvisorApp/1.0",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Location search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(query);
    }, 500);
  };

  const handleSelectLocation = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    ) {
      setMapPosition([lat, lon]);
      setSelectedLat(lat);
      setSelectedLon(lon);
      setSearchQuery(result.display_name || result.name || "");
      setSearchResults([]);
      if (onLocationChange) {
        onLocationChange(lat, lon);
      }
    }
  };

  return (
    <div className="location-map-container">
      <div className="map-controls">
        <div className="location-search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="location-search-input"
              placeholder="Search for a location in Sri Lanka (e.g., Colombo, Nuwara Eliya)..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() =>
                searchQuery.length >= 3 && searchLocation(searchQuery)
              }
            />
            {isSearching && (
              <span className="search-loading">🔍 Searching...</span>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="search-result-item"
                  onClick={() => handleSelectLocation(result)}
                >
                  <div className="result-name">
                    {result.display_name || result.name}
                  </div>
                  <div className="result-coords">
                    {parseFloat(result.lat).toFixed(4)}°,{" "}
                    {parseFloat(result.lon).toFixed(4)}°
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="coordinate-inputs">
          <button
            type="button"
            className="geolocate-btn"
            onClick={handleGeolocate}
          >
            Use My Location
          </button>
          <div className="coord-display">
            <span>Lat: {selectedLat.toFixed(4)}°</span>
            <span>Lon: {selectedLon.toFixed(4)}°</span>
          </div>
        </div>
      </div>

      <div className="map-wrapper" style={{ height }}>
        <MapContainer
          center={mapPosition}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={mapPosition}
            onPositionChange={handlePositionChange}
          />
        </MapContainer>
      </div>
    </div>
  );
}

export default LocationMap;
