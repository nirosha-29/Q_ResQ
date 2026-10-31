import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Emergency, Ambulance, Hospital } from '../types';

interface MapViewProps {
  emergencies?: Emergency[];
  ambulances?: Ambulance[];
  hospitals?: Hospital[];
  selectedRoute?: [number, number][];
  center?: [number, number];
  zoom?: number;
  highlightedId?: string;
  onMarkerClick?: (type: 'emergency' | 'ambulance' | 'hospital', id: string) => void;
  height?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  emergencies = [],
  ambulances = [],
  hospitals = [],
  selectedRoute = [],
  center = [12.9716, 77.5946], // Bengaluru center
  zoom = 12,
  highlightedId,
  onMarkerClick,
  height = '500px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(center, zoom);

      // OpenStreetMap standard tile provider
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on complete unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Route Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Custom SVG Marker Generators
    const createCustomIcon = (bgColor: string, borderColor: string, label: string, isHighlighted: boolean) => {
      const size = isHighlighted ? 36 : 28;
      const html = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${bgColor};
          border: 2px solid ${borderColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${size < 30 ? '11px' : '14px'};
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          ${isHighlighted ? 'box-shadow: 0 0 16px 4px rgba(239, 68, 68, 0.8);' : ''}
          cursor: pointer;
        ">
          ${label}
        </div>
      `;
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    // 1. Plot Emergencies (Red 🔴)
    emergencies.forEach((e) => {
      if (!e.latitude || !e.longitude) return;
      const isSelected = highlightedId === e.id;
      const marker = L.marker([e.latitude, e.longitude], {
        icon: createCustomIcon('#dc2626', '#fca5a5', '🚨', isSelected),
      });

      marker.bindPopup(`
        <div class="p-1 min-w-[200px]">
          <div class="flex items-center justify-between border-b border-slate-700 pb-1 mb-1">
            <span class="font-bold text-red-400 text-sm">${e.id}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-semibold">${e.calculated_priority || e.reported_severity}</span>
          </div>
          <div class="font-medium text-slate-200 text-sm">${e.patient_name} (${e.patient_age}y)</div>
          <div class="text-xs text-slate-300 mt-1">${e.emergency_type}</div>
          <div class="text-xs text-slate-400 truncate mt-0.5">${e.address}</div>
          <div class="mt-2 text-xs font-mono text-amber-300">Status: ${e.status}</div>
        </div>
      `);

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick('emergency', e.id);
      });

      markersLayerRef.current?.addLayer(marker);
    });

    // 2. Plot Ambulances (Blue 🔵)
    ambulances.forEach((a) => {
      if (!a.latitude || !a.longitude) return;
      const isSelected = highlightedId === a.id;
      const isAvailable = a.availability === 'Available';
      const bgColor = isAvailable ? '#0284c7' : '#475569';
      const marker = L.marker([a.latitude, a.longitude], {
        icon: createCustomIcon(bgColor, '#38bdf8', '🚑', isSelected),
      });

      marker.bindPopup(`
        <div class="p-1 min-w-[220px]">
          <div class="flex items-center justify-between border-b border-slate-700 pb-1 mb-1">
            <span class="font-bold text-sky-400 text-sm">${a.id}</span>
            <span class="text-xs px-1.5 py-0.5 rounded ${isAvailable ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-300'}">${a.availability}</span>
          </div>
          <div class="text-sm font-semibold text-slate-200">${a.vehicle_number} (${a.vehicle_type})</div>
          <div class="text-xs text-slate-300 mt-1">${a.provider}</div>
          <div class="text-xs text-slate-400 mt-0.5">${a.current_location_name}</div>
          <div class="text-xs text-slate-400 mt-1">Capabilities: ${a.capabilities?.join(', ') || 'BLS'}</div>
        </div>
      `);

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick('ambulance', a.id);
      });

      markersLayerRef.current?.addLayer(marker);
    });

    // 3. Plot Hospitals (Green 🟢)
    hospitals.forEach((h) => {
      if (!h.latitude || !h.longitude) return;
      const isSelected = highlightedId === h.id;
      const marker = L.marker([h.latitude, h.longitude], {
        icon: createCustomIcon('#15803d', '#86efac', '🏥', isSelected),
      });

      marker.bindPopup(`
        <div class="p-1 min-w-[220px]">
          <div class="flex items-center justify-between border-b border-slate-700 pb-1 mb-1">
            <span class="font-bold text-emerald-400 text-sm">${h.id}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold">${h.emergency_department_status}</span>
          </div>
          <div class="font-semibold text-slate-200 text-sm">${h.name}</div>
          <div class="text-xs text-slate-300 mt-1">${h.address}</div>
          <div class="text-xs text-slate-400 mt-1">Available ICU Beds: <strong class="text-emerald-300">${h.available_icu_beds}</strong> / ${h.icu_capacity}</div>
          <div class="text-xs text-slate-400">Specialties: ${h.capabilities?.slice(0, 4).join(', ') || 'Emergency'}</div>
        </div>
      `);

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick('hospital', h.id);
      });

      markersLayerRef.current?.addLayer(marker);
    });

    // 4. Plot Route Polyline (Orange 🟠)
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (selectedRoute && selectedRoute.length > 1) {
      const polyline = L.polyline(selectedRoute, {
        color: '#f97316',
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8',
      }).addTo(map);

      routeLayerRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [emergencies, ambulances, hospitals, selectedRoute, highlightedId]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      {/* Interactive Map Legend */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 shadow-lg pointer-events-auto flex flex-col gap-1.5">
        <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-0.5">EMS Map Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600 border border-red-300"></span>
          <span>Emergencies (🔴)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-600 border border-sky-300"></span>
          <span>Ambulances (🔵)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-300"></span>
          <span>Hospitals (🟢)</span>
        </div>
        {selectedRoute.length > 0 && (
          <div className="flex items-center gap-2 border-t border-slate-800 pt-1 text-orange-400 font-medium">
            <span className="w-4 h-1 bg-orange-500 rounded"></span>
            <span>Recommended Route (🟠)</span>
          </div>
        )}
      </div>
    </div>
  );
};
