'use client';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

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
}

/**
 * MapClickHandler - Internal component to handle map clicks
 */
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

/**
 * MapCenterUpdater - Internal component to update map center when coordinates change
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
 * LocationPickerMap Component
 * 
 * Interactive map for selecting a location by clicking.
 * - Centers on Portugal (approx [39.5, -8.0])
 * - Shows a marker at the selected location
 * - Updates parent component's latitude/longitude state on click
 * - Uses OpenStreetMap tiles (no Google Maps)
 * 
 * @param latitude - Current latitude value (can be null)
 * @param longitude - Current longitude value (can be null)
 * @param onLocationSelect - Callback function called when user clicks the map
 */
export const LocationPickerMap = ({
  latitude,
  longitude,
  onLocationSelect,
}: LocationPickerMapProps) => {
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

  return (
    <MapContainer
      center={mapCenter}
      zoom={initialZoom}
      style={{ height: '400px', width: '100%' }}
      scrollWheelZoom={true}
      className="rounded-md border border-input"
    >
      {/* OpenStreetMap tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Handle map clicks */}
      <MapClickHandler onLocationSelect={onLocationSelect} />

      {/* Update map center when coordinates change */}
      <MapCenterUpdater center={mapCenter} zoom={initialZoom} />

      {/* Show marker if location is selected */}
      {latitude !== null && longitude !== null && (
        <Marker position={[latitude, longitude]} />
      )}
    </MapContainer>
  );
};
