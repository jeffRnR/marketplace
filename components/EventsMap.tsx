"use client";

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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

const NAIROBI: [number, number] = [36.817223, -1.286389];

export default function EventsMap({ events, userLocation }: EventsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markersRef   = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:     "mapbox://styles/mapbox/dark-v11",
      center:    NAIROBI,
      zoom:      11,
      scrollZoom: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update markers when events change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const validEvents = events.filter(
      e => typeof e.lat === "number" && typeof e.lng === "number"
    );

    if (!validEvents.length) return;

    const bounds = new mapboxgl.LngLatBounds();

    validEvents.forEach(evt => {
      const lng = evt.lng as number;
      const lat = evt.lat as number;

      // Custom marker element
      const el = document.createElement("div");
      el.style.cssText = `
        width: 14px; height: 14px;
        background: #8b5cf6;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 0 3px rgba(139,92,246,0.3);
      `;

      // Popup
      const popup = new mapboxgl.Popup({ offset: 16, closeButton: false })
        .setHTML(`
          <div style="font-family:sans-serif;min-width:180px">
            <p style="font-weight:600;font-size:13px;margin:0 0 4px">${evt.title}</p>
            <p style="font-size:12px;color:#6b7280;margin:0 0 2px">📍 ${evt.location}</p>
            <p style="font-size:12px;color:#6b7280;margin:0 0 8px">📅 ${new Date(evt.date).toLocaleDateString()}</p>
            <a href="/events/${evt.id}" style="font-size:12px;font-weight:600;background:#7c3aed;color:#fff;padding:4px 10px;border-radius:6px;text-decoration:none">
              View event
            </a>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
    });

    // Fit bounds
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    }
  }, [events]);

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    const el = document.createElement("div");
    el.style.cssText = `
      width: 16px; height: 16px;
      background: #10b981;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(16,185,129,0.25);
    `;

    new mapboxgl.Marker(el)
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new mapboxgl.Popup({ closeButton: false }).setText("Your location"))
      .addTo(map);
  }, [userLocation]);

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-gray-700">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}