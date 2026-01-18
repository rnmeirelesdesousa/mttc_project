'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { PublishedMill, MapWaterLine } from '@/actions/public';
import { getPublicUrl } from '@/lib/storage';
import { getMillIcon } from '@/lib/map-icons';

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
  waterLines: MapWaterLine[];
  locale: string;
}

/**
 * MillMap Component
 * 
 * Displays published mills and water lines on an interactive Leaflet map.
 * - Centers on Portugal (approx [39.5, -8.0])
 * - Shows markers for each mill (with custom icons if available)
 * - Shows polylines for each water line (levada) with their stored colors
 * - Popups display mill/water line information and links
 * - Uses OpenStreetMap tiles (no Google Maps)
 * 
 * @param mills - Array of published mills to display
 * @param waterLines - Array of water lines to display
 * @param locale - Current locale for i18n and link generation
 */
export const MillMap = ({ mills, waterLines, locale }: MillMapProps) => {
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

      {/* Render water lines as polylines (Phase 5.9.2.4) */}
      {waterLines.map((waterLine) => {
        if (!waterLine.path || waterLine.path.length < 2) {
          return null; // Skip invalid water lines
        }

        return (
          <Polyline
            key={waterLine.id}
            positions={waterLine.path}
            pathOptions={{
              color: waterLine.color,
              weight: 4,
              opacity: 0.8,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-1">{waterLine.name}</h3>
                <p className="text-xs text-muted-foreground">{waterLine.slug}</p>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {/* Render markers for each mill with clustering (Phase 5.9.3) */}
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={(cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${count}</div>`,
            className: 'custom-cluster-icon',
            iconSize: [40, 40],
          });
        }}
      >
        {mills.map((mill) => {
          // Skip mills without valid coordinates
          if (!mill.lat || !mill.lng || isNaN(mill.lat) || isNaN(mill.lng)) {
            return null;
          }

          const position: LatLngExpression = [mill.lat, mill.lng];
          const millTitle = mill.title || mill.slug; // Fallback to slug if title is null
          const imageUrl = getPublicUrl(mill.mainImage);
          
          // Get custom icon if available (Phase 5.9.2.4)
          const customIcon = getMillIcon(mill.customIconUrl);

          return (
            <Marker key={mill.id} position={position} icon={customIcon}>
              <Popup>
                <div className="p-2">
                  <div className="flex items-start gap-2 mb-2">
                    {imageUrl ? (
                      <div className="flex-shrink-0">
                        <Image
                          src={imageUrl}
                          alt={millTitle}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">—</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">{millTitle}</h3>
                      {mill.municipality && (
                        <p className="text-xs text-gray-600 mb-2">
                          {mill.municipality}
                          {mill.district && `, ${mill.district}`}
                        </p>
                      )}
                    </div>
                  </div>
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
      </MarkerClusterGroup>
    </MapContainer>
  );
};

