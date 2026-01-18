'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMapEvents, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue in Next.js/Webpack
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LevadaEditorProps {
  color: string;
  onPathChange: (path: [number, number][]) => void;
}

/**
 * MapClickHandler - Handles map clicks to add points to the polyline
 */
function MapClickHandler({
  isDrawing,
  onPointAdd,
}: {
  isDrawing: boolean;
  onPointAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        const { lat, lng } = e.latlng;
        onPointAdd(lat, lng);
      }
    },
  });
  return null;
}

/**
 * MapCenterUpdater - Updates map center when needed
 */
function MapCenterUpdater({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom: number;
}) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

/**
 * LevadaEditor Component
 * 
 * Interactive map for drawing water lines (levadas) by clicking points.
 * - Centers on Portugal (approx [39.5, -8.0])
 * - Allows clicking to add points to create a polyline
 * - Displays the current path as a colored line
 * - Converts coordinates to GeoJSON LineString format
 * 
 * @param color - Hex color code for the polyline (e.g., '#3b82f6')
 * @param onPathChange - Callback function called when the path changes, receives array of [lng, lat] tuples
 */
export const LevadaEditor = ({ color, onPathChange }: LevadaEditorProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [path, setPath] = useState<[number, number][]>([]);

  // Center of Portugal (approximate geographic center)
  const portugalCenter: LatLngExpression = [39.5, -8.0];
  const defaultZoom = 7;

  // Convert path from [lat, lng] to [lng, lat] for GeoJSON and notify parent
  useEffect(() => {
    if (path.length > 0) {
      // Convert from Leaflet's [lat, lng] to GeoJSON's [lng, lat]
      const geoJsonPath: [number, number][] = path.map(([lat, lng]) => [lng, lat]);
      onPathChange(geoJsonPath);
    } else {
      onPathChange([]);
    }
  }, [path, onPathChange]);

  const handlePointAdd = (lat: number, lng: number) => {
    setPath((prev) => [...prev, [lat, lng]]);
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearPath = () => {
    setPath([]);
    setIsDrawing(false);
  };

  const handleUndoLastPoint = () => {
    setPath((prev) => prev.slice(0, -1));
  };

  // Convert path to Leaflet format [lat, lng] for display
  const leafletPath: LatLngExpression[] = path.map(([lat, lng]) => [lat, lng]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={isDrawing ? handleStopDrawing : handleStartDrawing}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            isDrawing
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isDrawing ? 'Stop Drawing' : 'Start Drawing'}
        </button>
        <button
          type="button"
          onClick={handleUndoLastPoint}
          disabled={path.length === 0}
          className="px-4 py-2 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Undo Last Point
        </button>
        <button
          type="button"
          onClick={handleClearPath}
          disabled={path.length === 0}
          className="px-4 py-2 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Clear Path
        </button>
        {path.length > 0 && (
          <span className="px-4 py-2 text-sm text-muted-foreground self-center">
            Points: {path.length}
          </span>
        )}
      </div>

      <div className="relative">
        <MapContainer
          center={portugalCenter}
          zoom={defaultZoom}
          style={{ height: '500px', width: '100%' }}
          scrollWheelZoom={true}
          className="rounded-md border border-input"
        >
          {/* OpenStreetMap tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Handle map clicks */}
          <MapClickHandler isDrawing={isDrawing} onPointAdd={handlePointAdd} />

          {/* Display polyline if path has points */}
          {leafletPath.length > 1 && (
            <Polyline
              positions={leafletPath}
              pathOptions={{
                color,
                weight: 4,
                opacity: 0.8,
              }}
            />
          )}

          {/* Show drawing mode indicator */}
          {isDrawing && (
            <div className="absolute top-4 left-4 z-[1000] bg-blue-600 text-white px-3 py-2 rounded-md shadow-lg">
              <p className="text-sm font-medium">Drawing Mode: Click on the map to add points</p>
            </div>
          )}
        </MapContainer>
      </div>
    </div>
  );
};
