'use client';

import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMapEvents, useMap, LayersControl } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import type { PublishedMill, MapWaterLine } from '@/actions/public';
import { findNearestWaterLine } from '@/lib/gis-utils';

// Fix Leaflet icon issue in Next.js/Webpack
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  // Phase 5.9.3: Contextual creation layer - existing data for reference
  existingMills?: PublishedMill[];
  existingWaterLines?: MapWaterLine[];
}

/**
 * MapClickHandler - Internal component to handle map clicks with snap-to-feature
 */
function MapClickHandler({
  onLocationSelect,
  existingWaterLines,
  onSnapPreview,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  existingWaterLines: MapWaterLine[];
  onSnapPreview: (point: [number, number] | null) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      
      // Check for nearby water lines and snap if within 10 meters
      const nearest = findNearestWaterLine(lat, lng, existingWaterLines, 10);
      
      if (nearest) {
        // Snap to the nearest point on the water line
        const [snappedLat, snappedLng] = nearest.snappedPoint;
        onLocationSelect(snappedLat, snappedLng);
        onSnapPreview(null); // Clear preview after snap
      } else {
        // Use clicked location as-is
        onLocationSelect(lat, lng);
        onSnapPreview(null);
      }
    },
    mousemove(e) {
      const { lat, lng } = e.latlng;
      
      // Check for nearby water lines to show snap preview
      const nearest = findNearestWaterLine(lat, lng, existingWaterLines, 10);
      
      if (nearest) {
        onSnapPreview(nearest.snappedPoint);
      } else {
        onSnapPreview(null);
      }
    },
  });
  return null;
}

/**
 * MapCenterUpdater - Internal component to update map center when coordinates change
 * Only updates center when latitude/longitude props actually change, not on every render
 * Preserves user's manual zoom and pan position
 */
function MapCenterUpdater({
  latitude,
  longitude,
  initialCenter,
  initialZoom,
}: {
  latitude: number | null;
  longitude: number | null;
  initialCenter: LatLngExpression;
  initialZoom: number;
}) {
  const map = useMap();
  const hasInitialized = useRef(false);
  const prevLat = useRef<number | null>(null);
  const prevLng = useRef<number | null>(null);
  
  useEffect(() => {
    if (!hasInitialized.current) {
      // On first render, set both center and zoom
      map.setView(initialCenter, initialZoom);
      hasInitialized.current = true;
      prevLat.current = latitude;
      prevLng.current = longitude;
    } else {
      // Only update center if latitude/longitude actually changed
      const latChanged = prevLat.current !== latitude;
      const lngChanged = prevLng.current !== longitude;
      
      if (latChanged || lngChanged) {
        // Only pan to new location if coordinates were actually set/changed
        if (latitude !== null && longitude !== null) {
          map.panTo([latitude, longitude]);
        }
        prevLat.current = latitude;
        prevLng.current = longitude;
      }
    }
  }, [map, latitude, longitude, initialCenter, initialZoom]);
  
  return null;
}

/**
 * LocationPickerMap Component
 * 
 * Interactive map for selecting a location by clicking.
 * - Centers on Portugal (approx [39.5, -8.0])
 * - Shows a marker at the selected location
 * - Updates parent component's latitude/longitude state on click
 * - Uses OpenStreetMap tiles (no Google Maps)
 * - Phase 5.9.3: Shows existing mills and water lines as reference layer
 * 
 * @param latitude - Current latitude value (can be null)
 * @param longitude - Current longitude value (can be null)
 * @param onLocationSelect - Callback function called when user clicks the map
 * @param existingMills - Optional array of existing mills to display as reference (small gray circles)
 * @param existingWaterLines - Optional array of existing water lines to display as reference (light-blue dashed lines)
 */
export const LocationPickerMap = ({
  latitude,
  longitude,
  onLocationSelect,
  existingMills = [],
  existingWaterLines = [],
}: LocationPickerMapProps) => {
  // State for snap preview indicator
  const [snapPreview, setSnapPreview] = useState<[number, number] | null>(null);

  // Center of Portugal (approximate geographic center)
  const portugalCenter: LatLngExpression = [39.5, -8.0];
  const defaultZoom = 7;

  // Determine map center: use selected location if available, otherwise use Portugal center
  const mapCenter: LatLngExpression =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : portugalCenter;

  // Determine initial zoom: zoom in if location is selected, otherwise use default
  const initialZoom = latitude !== null && longitude !== null ? 12 : defaultZoom;

  // Get API keys from environment variables
  const thunderforestApiKey = process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY;
  const stadiaApiKey = process.env.NEXT_PUBLIC_STADIA_API_KEY;

  return (
    <MapContainer
      center={mapCenter}
      zoom={initialZoom}
      maxZoom={21}
      style={{ height: '400px', width: '100%', cursor: snapPreview ? 'crosshair' : 'default' }}
      scrollWheelZoom={true}
      className="rounded-md border border-input"
    >
      {/* Layer Control - positioned in bottom right */}
      <LayersControl position="bottomright">
        {/* Stadia.AlidadeSatellite - Default base layer (Requires API key) */}
        {stadiaApiKey ? (
          <LayersControl.BaseLayer checked name="Stadia Alidade Satellite">
            <TileLayer
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
              url={`https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.png?api_key=${stadiaApiKey}`}
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
        ) : null}

        {/* OpenStreetMap.HOT - Fallback default if Stadia API key not available */}
        <LayersControl.BaseLayer checked={!stadiaApiKey} name="OpenStreetMap HOT">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>'
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>

        {/* Stadia.StamenTerrain - Requires API key */}
        {stadiaApiKey && (
          <LayersControl.BaseLayer name="Stadia Stamen Terrain">
            <TileLayer
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://stamen.com">Stamen Design</a>, &copy; <a href="https://openmaptiles.org">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
              url={`https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png?api_key=${stadiaApiKey}`}
              maxZoom={18}
            />
          </LayersControl.BaseLayer>
        )}

        {/* Thunderforest.OpenCycleMap - Requires API key */}
        {thunderforestApiKey && (
          <LayersControl.BaseLayer name="Thunderforest OpenCycleMap">
            <TileLayer
              attribution='&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={`https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${thunderforestApiKey}`}
              maxZoom={21}
            />
          </LayersControl.BaseLayer>
        )}

        {/* Thunderforest.Neighbourhood - Requires API key */}
        {thunderforestApiKey && (
          <LayersControl.BaseLayer name="Thunderforest Neighbourhood">
            <TileLayer
              attribution='&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={`https://{s}.tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=${thunderforestApiKey}`}
              maxZoom={21}
            />
          </LayersControl.BaseLayer>
        )}

        {/* MtbMap */}
        <LayersControl.BaseLayer name="MtbMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors & <a href="https://www.mtbmap.cz/">MtbMap</a>'
            url="http://tile.mtbmap.cz/mtbmap_tiles/{z}/{x}/{y}.png"
            maxZoom={18}
          />
        </LayersControl.BaseLayer>

        {/* OpenStreetMap Standard - Always available as fallback option */}
        <LayersControl.BaseLayer name="OpenStreetMap Standard">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Handle map clicks with snap-to-feature */}
      <MapClickHandler 
        onLocationSelect={onLocationSelect}
        existingWaterLines={existingWaterLines}
        onSnapPreview={setSnapPreview}
      />

      {/* Update map center when coordinates change */}
      <MapCenterUpdater 
        latitude={latitude} 
        longitude={longitude} 
        initialCenter={mapCenter} 
        initialZoom={initialZoom} 
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
      {snapPreview && (
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

      {/* Show marker if location is selected */}
      {latitude !== null && longitude !== null && (
        <Marker position={[latitude, longitude]} />
      )}
    </MapContainer>
  );
};
