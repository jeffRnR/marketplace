"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Event {
  id: string | number;
  title: string;
  location: string;
  date: string;
  host: string;
  lat?: number | null;
  lng?: number | null;
}

interface EventsMapProps {
  events: (Event & { distance?: number })[];
  userLocation?: { lat: number; lng: number } | null;
}

/** Fit map to all marker bounds */
function FitBounds({ events }: { events: Event[] }) {
  const map: any = useMap();

  useEffect(() => {
    const points: [number, number][] = events
      .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
      .map((e) => [e.lat as number, e.lng as number]);

    if (!points.length) return;

    try {
      const bounds = L.latLngBounds(points as any);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch {}
  }, [events, map]);

  return null;
}

// Local cache for geocoding
const GEO_CACHE_KEY = "geo_cache_v1";
function loadGeoCache(): Record<string, { lat: number; lng: number }> {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveGeoCache(cache: Record<string, { lat: number; lng: number }>) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// Geocode function using Nominatim
async function geocodeLocation(location: string) {
  const cache = loadGeoCache();
  const key = location.trim().toLowerCase();
  if (cache[key]) return cache[key];

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    location
  )}`;

  try {
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      cache[key] = { lat, lng };
      saveGeoCache(cache);
      return { lat, lng };
    }
    return null;
  } catch (err) {
    console.warn("Geocode error:", err);
    return null;
  }
}

const EventsMap: React.FC<EventsMapProps> = ({ events, userLocation }) => {
  const [mappedEvents, setMappedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const mapRef = useRef<any>(null);

  const defaultCenter: [number, number] = [-1.286389, 36.817223]; // Nairobi

  const eventIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -30],
  });

  // Geocode events that lack lat/lng
  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      setLoading(true);
      const results: Event[] = [];

      for (const ev of events) {
        if (typeof ev.lat === "number" && typeof ev.lng === "number") {
          results.push(ev);
          continue;
        }

        const coords = await geocodeLocation(ev.location);
        if (cancelled) return;

        results.push({
          ...ev,
          lat: coords?.lat ?? defaultCenter[0],
          lng: coords?.lng ?? defaultCenter[1],
        });

        await new Promise((r) => setTimeout(r, 200));
      }

      if (!cancelled) {
        setMappedEvents(results);
        setLoading(false);
      }
    }

    prepare();
    return () => {
      cancelled = true;
    };
  }, [events]);

  // Handle user search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim() || !mapRef.current) return;

    const coords = await geocodeLocation(searchValue);
    if (coords) {
      mapRef.current.setView([coords.lat, coords.lng], 14);
    } else {
      alert("Location not found.");
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-gray-800 rounded-lg flex items-center justify-center">
        <p className="text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-gray-700">
      {/* Search Bar
      <form
        onSubmit={handleSearch}
        className="absolute z-10 top-3 left-1/2 transform -translate-x-1/2 flex shadow-md bg-white rounded overflow-hidden"
      >
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search location..."
          className="px-3 py-2 w-64 text-sm outline-none"
        />
        <button
          type="submit"
          className="bg-purple-600 text-white px-3 py-2 text-sm font-semibold"
        >
          Go
        </button>
      </form> */}
      <div className="relative z-0 w-full h-[400px] rounded-lg overflow-hidden border border-gray-700">
        <MapContainer
          {...({
            center: defaultCenter,
            zoom: 12,
            style: { width: "100%", height: "100%" },
            whenCreated: (map: any) => (mapRef.current = map),
            scrollWheelZoom: false,
          } as any)}
        >
          <TileLayer
            {...({
              url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
              attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
            } as any)}
          />

          {mappedEvents.map((evt) =>
            typeof evt.lat === "number" && typeof evt.lng === "number" ? (
              <Marker
                key={evt.id}
                position={[evt.lat, evt.lng] as any}
                {...({ icon: eventIcon } as any)}
              >
                <Popup>
                  <div className="text-gray-800">
                    <h3 className="font-bold text-sm mb-1">{evt.title}</h3>
                    <p className="text-xs text-gray-600 mb-1">
                      📍 {evt.location}
                    </p>
                    <p className="text-xs text-gray-600 mb-1">
                      📅 {new Date(evt.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600 mb-1">👤 {evt.host}</p>
                    <a
                      href={`/events/${evt.id}`}
                      className="inline-block mt-2 text-xs font-semibold bg-purple-600 text-white px-2 py-1 rounded"
                    >
                      View Details
                    </a>
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}

          <FitBounds events={mappedEvents} />
        </MapContainer>
      </div>
    </div>
  );
};

export default EventsMap;
