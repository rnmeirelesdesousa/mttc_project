'use client';

import { MapContainer, TileLayer, Marker, LayersControl } from 'react-leaflet';
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

  // Get API keys from environment variables
  const stadiaApiKey = process.env.NEXT_PUBLIC_STADIA_API_KEY;

  return (
    <MapContainer
      center={position}
      zoom={13}
      maxZoom={20}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      {/* Layer Control - positioned in bottom right */}
      <LayersControl position="bottomright">
        {/* Esri World Imagery - High quality free satellite map */}
        <LayersControl.BaseLayer checked name="Esri World Imagery">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>

        {/* Stadia.AlidadeSatellite - Default base layer (Requires API key) 
        {stadiaApiKey ? (
          <LayersControl.BaseLayer name="Stadia Alidade Satellite">
            <TileLayer
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
              url={`https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.png?api_key=${stadiaApiKey}`}
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
        ) : null}
        */}

        {/* OpenStreetMap Standard - Fallback default if Stadia API key not available */}
        <LayersControl.BaseLayer name="OpenStreetMap Standard">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <Marker position={position} />
    </MapContainer>
  );
};
