'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
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

interface LocationMapProps {
  latitude: number;
  longitude: number;
}

/**
 * LocationMap Component
 * 
 * Read-only map for displaying a single location.
 * - Centers on the provided coordinates
 * - Shows a marker at the location
 * - Non-interactive (read-only display)
 * 
 * @param latitude - Latitude of the location
 * @param longitude - Longitude of the location
 */
export const LocationMap = ({
  latitude,
  longitude,
}: LocationMapProps) => {
  const position: LatLngExpression = [latitude, longitude];

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} />
    </MapContainer>
  );
};
