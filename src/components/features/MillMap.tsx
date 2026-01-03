'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PublishedMill } from '@/actions/public';

// Fix Leaflet icon issue in Next.js/Webpack
// Leaflet's default icon paths don't work correctly with Webpack bundling
// We need to manually set the icon URLs to point to the correct paths
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MillMapProps {
  mills: PublishedMill[];
  locale: string;
}

/**
 * MillMap Component
 * 
 * Displays published mills on an interactive Leaflet map.
 * - Centers on Portugal (approx [39.5, -8.0])
 * - Shows markers for each mill
 * - Popups display mill title and link to detail page
 * - Uses OpenStreetMap tiles (no Google Maps)
 * 
 * @param mills - Array of published mills to display
 * @param locale - Current locale for i18n and link generation
 */
export const MillMap = ({ mills, locale }: MillMapProps) => {
  const t = useTranslations();

  // Center of Portugal (approximate geographic center)
  const portugalCenter: LatLngExpression = [39.5, -8.0];
  const defaultZoom = 7;

  return (
    <MapContainer
      center={portugalCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      {/* OpenStreetMap tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render markers for each mill */}
      {mills.map((mill) => {
        // Skip mills without valid coordinates
        if (!mill.lat || !mill.lng || isNaN(mill.lat) || isNaN(mill.lng)) {
          return null;
        }

        const position: LatLngExpression = [mill.lat, mill.lng];
        const millTitle = mill.title || mill.slug; // Fallback to slug if title is null

        return (
          <Marker key={mill.id} position={position}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-2">{millTitle}</h3>
                {mill.municipality && (
                  <p className="text-xs text-gray-600 mb-2">
                    {mill.municipality}
                    {mill.district && `, ${mill.district}`}
                  </p>
                )}
                <Link
                  href={`/${locale}/mill/${mill.slug}`}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {t('map.viewDetails')}
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

