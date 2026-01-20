'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
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
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LevadaMapProps {
  mills: PublishedMill[];
  waterLines: MapWaterLine[];
  locale: string;
}

/**
 * Component to fit map bounds to show all water lines and mills
 */
function FitBounds({ waterLines, mills }: { waterLines: MapWaterLine[]; mills: PublishedMill[] }) {
  const map = useMap();

  useEffect(() => {
    // Collect all coordinates from water lines and mills
    const allCoords: [number, number][] = [];

    // Add water line path coordinates
    waterLines.forEach((waterLine) => {
      if (waterLine.path && waterLine.path.length > 0) {
        allCoords.push(...waterLine.path);
      }
    });

    // Add mill coordinates
    mills.forEach((mill) => {
      if (mill.lat !== null && mill.lng !== null && !isNaN(mill.lat) && !isNaN(mill.lng)) {
        allCoords.push([mill.lat, mill.lng]);
      }
    });

    // If we have coordinates, fit bounds
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, {
        padding: [50, 50], // Add padding around the bounds
        maxZoom: 19, // Maximum zoom level
      });
    }
  }, [map, waterLines, mills]);

  return null;
}

/**
 * LevadaMap Component
 * 
 * Specialized map component for displaying a single levada and its connected mills.
 * - Automatically fits bounds to show the entire levada path and all connected mills
 * - Shows the levada as a polyline (without popup)
 * - Shows markers for connected mills (with popups and links)
 * - Uses OpenStreetMap tiles
 * 
 * @param mills - Array of published mills to display
 * @param waterLines - Array of water lines to display (typically just one)
 * @param locale - Current locale for i18n and link generation
 */
export const LevadaMap = ({ mills, waterLines, locale }: LevadaMapProps) => {
  const t = useTranslations();

  // Center of Portugal (fallback if no bounds can be calculated)
  const portugalCenter: LatLngExpression = [39.5, -8.0];
  const defaultZoom = 7;

  return (
    <MapContainer
      center={portugalCenter}
      zoom={defaultZoom}
      maxZoom={19}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      {/* OpenStreetMap tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Fit bounds to show all water lines and mills */}
      <FitBounds waterLines={waterLines} mills={mills} />

      {/* Render water lines as polylines (without popup on levada detail page) */}
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
            interactive={false} // Make the polyline non-interactive (no popup)
          />
        );
      })}

      {/* Render markers for each mill with clustering */}
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
          
          // Get custom icon if available
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
