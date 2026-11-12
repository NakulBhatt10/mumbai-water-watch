import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

import type { WaterObservation } from "@/lib/water-data";

type MumbaiWaterMapProps = {
  observations: WaterObservation[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

export function MumbaiWaterMap({ observations }: MumbaiWaterMapProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;

    const map = L.map(elementRef.current, {
      center: [19.076, 72.8777],
      zoom: 11,
      scrollWheelZoom: true,
      zoomControl: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const refreshSize = () => map.invalidateSize();
    window.requestAnimationFrame(refreshSize);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const markerLayer = markersRef.current;
    if (!markerLayer) return;

    markerLayer.clearLayers();
    const byCoordinate = new Map<string, WaterObservation[]>();
    observations.forEach((observation) => {
      if (observation.latitude === null || observation.longitude === null) return;
      const key = `${observation.latitude},${observation.longitude}`;
      const group = byCoordinate.get(key) ?? [];
      group.push(observation);
      byCoordinate.set(key, group);
    });

    byCoordinate.forEach((group) => {
      const first = group[0];
      if (!first || first.latitude === null || first.longitude === null) return;
      const area = escapeHtml(first.area);
      const readings = group
        .slice(0, 5)
        .map((item) => `${escapeHtml(item.measure)}: ${escapeHtml(item.value)}${item.unit ? ` ${escapeHtml(item.unit)}` : ""}`)
        .join("<br>");
      const extraReadings = group.length > 5 ? `<br>+${group.length - 5} more readings` : "";
      const marker = L.circleMarker([first.latitude, first.longitude], {
        radius: 7,
        color: "var(--map-point-stroke)",
        weight: 2,
        fillColor: "var(--map-point-fill)",
        fillOpacity: 0.95,
      });
      marker.bindPopup(`<strong>${area}</strong><br>${readings}${extraReadings}`);
      marker.addTo(markerLayer);
    });
  }, [observations]);

  return <div ref={elementRef} className="h-full min-h-80 w-full" aria-label="Interactive map centered on Mumbai" role="application" />;
}