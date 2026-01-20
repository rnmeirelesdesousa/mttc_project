'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PublishedMill, MapWaterLine } from '@/actions/public';
import { findNearestMill } from '@/lib/gis-utils';

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
  // Phase 5.9.3: Contextual creation layer - existing data for reference
  existingMills?: PublishedMill[];
  existingWaterLines?: MapWaterLine[];
  // Phase 5.9.3.8: Initial path for edit mode (in Leaflet format: [lat, lng][])
  initialPath?: [number, number][];
}

/**
 * MapClickHandler - Handles map clicks to add points to the polyline with snap-to-mill
 */
function MapClickHandler({
  isDrawing,
  onPointAdd,
  existingMills,
  onSnapPreview,
}: {
  isDrawing: boolean;
  onPointAdd: (lat: number, lng: number) => void;
  existingMills: PublishedMill[];
  onSnapPreview: (point: [number, number] | null) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        const { lat, lng } = e.latlng;
        
        // Check for nearby mills and snap if within 10 meters
        const nearest = findNearestMill(lat, lng, existingMills, 10);
        
        if (nearest) {
          // Snap to the nearest mill
          const [snappedLat, snappedLng] = nearest.snappedPoint;
          onPointAdd(snappedLat, snappedLng);
          onSnapPreview(null); // Clear preview after snap
        } else {
          // Use clicked location as-is
          onPointAdd(lat, lng);
          onSnapPreview(null);
        }
      }
    },
    mousemove(e) {
      if (isDrawing) {
        const { lat, lng } = e.latlng;
        
        // Check for nearby mills to show snap preview
        const nearest = findNearestMill(lat, lng, existingMills, 10);
        
        if (nearest) {
          onSnapPreview(nearest.snappedPoint);
        } else {
          onSnapPreview(null);
        }
      } else {
        onSnapPreview(null);
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
 * - Phase 5.9.3: Shows existing mills as reference layer
 * 
 * @param color - Hex color code for the polyline (e.g., '#3b82f6')
 * @param onPathChange - Callback function called when the path changes, receives array of [lng, lat] tuples
 * @param existingMills - Optional array of existing mills to display as reference (colored circles)
 * @param existingWaterLines - Optional array of existing water lines to display as reference (light-blue dashed lines)
 */
export const LevadaEditor = ({ color, onPathChange, existingMills = [], existingWaterLines = [], initialPath = [] }: LevadaEditorProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [path, setPath] = useState<[number, number][]>(initialPath);
  const [hasInitialized, setHasInitialized] = useState(initialPath.length > 0);
  const [snapPreview, setSnapPreview] = useState<[number, number] | null>(null);

  // Center of Portugal (approximate geographic center)
  // Phase 5.9.7.1: If path has points, center on the drawn coordinates for verification
  // If initialPath exists, center on the first point
  const portugalCenter: LatLngExpression = path.length > 0
    ? [path[0]![0], path[0]![1]] // Use first point of current path (Leaflet format: [lat, lng])
    : initialPath.length > 0 
      ? [initialPath[0]![0], initialPath[0]![1]]
      : [39.5, -8.0];
  const defaultZoom = (path.length > 0 || initialPath.length > 0) ? 12 : 7;

  // Update path when initialPath changes (for edit mode)
  // Only set once when initialPath becomes available
  useEffect(() => {
    if (initialPath.length > 0 && !hasInitialized) {
      setPath(initialPath);
      setHasInitialized(true);
    }
  }, [initialPath, hasInitialized]);

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
          maxZoom={19}
          style={{ height: '500px', width: '100%', cursor: snapPreview && isDrawing ? 'crosshair' : 'default' }}
          scrollWheelZoom={true}
          className="rounded-md border border-input"
        >
          {/* OpenStreetMap tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Phase 5.9.7.1: Map center updater - ensures map centers on drawn coordinates */}
          <MapCenterUpdater center={portugalCenter} zoom={defaultZoom} />

          {/* Handle map clicks with snap-to-mill */}
          <MapClickHandler 
            isDrawing={isDrawing} 
            onPointAdd={handlePointAdd}
            existingMills={existingMills}
            onSnapPreview={setSnapPreview}
          />

          {/* Phase 5.9.3: Render existing water lines as reference (light-blue dashed lines, thicker) */}
          {existingWaterLines.map((waterLine) => {
            if (!waterLine.path || waterLine.path.length < 2) {
              return null;
            }

            return (
              <Polyline
                key={waterLine.id}
                positions={waterLine.path}
                pathOptions={{
                  color: '#93c5fd', // Light blue
                  weight: 3, // Thicker than before (was 2)
                  opacity: 0.5,
                  dashArray: '10, 5', // Dashed line
                }}
              />
            );
          })}

          {/* Phase 5.9.3: Render existing mills as reference (colored circles, more visible) */}
          {existingMills.map((mill) => {
            if (!mill.lat || !mill.lng || isNaN(mill.lat) || isNaN(mill.lng)) {
              return null;
            }

            // Use blue color for visibility (matching project's primary color)
            return (
              <CircleMarker
                key={mill.id}
                center={[mill.lat, mill.lng]}
                radius={6} // Larger than before (was 4)
                pathOptions={{
                  color: '#3b82f6', // Blue (project's primary color)
                  fillColor: '#3b82f6', // Blue fill
                  fillOpacity: 0.7, // More opaque than before
                  weight: 2, // Thicker border
                }}
              />
            );
          })}

          {/* Show snap preview indicator */}
          {snapPreview && isDrawing && (
            <CircleMarker
              center={snapPreview}
              radius={8}
              pathOptions={{
                color: '#10b981', // Green color for snap indicator
                fillColor: '#10b981',
                fillOpacity: 0.6,
                weight: 2,
              }}
            />
          )}

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
