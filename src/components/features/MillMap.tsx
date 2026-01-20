'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { PublishedMill, MapWaterLine } from '@/actions/public';
import { getMillIcon } from '@/lib/map-icons';
import { ConnectionLine } from './ConnectionLine';
import { DynamicSVGMarker } from './DynamicSVGMarker';

/**
 * MapClickHandler Component
 * 
 * Handles map background clicks to close the postal card.
 */
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });
  return null;
}

/**
 * FocusZoomHandler Component
 * 
 * Handles automatic map zoom and centering when a mill is selected.
 * Centers the marker at 50% of the viewport width.
 * Uses a single flyTo animation by calculating the offset coordinates first.
 */
function FocusZoomHandler({ 
  lat, lng
}: { 
  lat: number | null; 
  lng: number | null; 
}) {
  const map = useMap();

  useEffect(() => {
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      const zoomLevel = 18;
      const targetLatLng: [number, number] = [lat, lng];
      
      // Single smooth animation directly to the marker coordinates
      // This centers the marker at 50% of viewport width (center of screen)
      map.flyTo(targetLatLng, zoomLevel, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [map, lat, lng]);

  return null;
}

/**
 * MapResizeHandler Component
 * 
 * Handles map resize events to ensure the map properly adjusts when container size changes.
 * This is important when the sidebar toggles and the map container width changes.
 */
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    // Listen for window resize events
    const handleResize = () => {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Also trigger on mount to ensure initial size is correct
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

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
  onMillClick?: (millId: string) => void;
  onMapClick?: () => void;
  selectedMillCoords?: { lat: number; lng: number } | null;
  mapContainerRef?: React.RefObject<HTMLDivElement>;
  selectedMillId?: string | null;
  sidebarRef?: React.RefObject<HTMLDivElement>;
}

/**
 * MillMap Component
 * 
 * Displays published mills and water lines on an interactive Leaflet map.
 * - Centers on Portugal (approx [39.5, -8.0])
 * - Shows markers for each mill (with custom icons if available)
 * - Shows polylines for each water line (levada) with their stored colors
 * - Marker clicks open the floating postal card (MillSidebar)
 * - Map background clicks close the postal card
 * - Uses OpenStreetMap tiles (no Google Maps)
 * 
 * @param mills - Array of published mills to display
 * @param waterLines - Array of water lines to display
 * @param locale - Current locale for i18n and link generation
 * @param onMillClick - Callback when a mill marker is clicked
 * @param onMapClick - Callback when map background is clicked
 */
export const MillMap = ({ mills, waterLines, locale, onMillClick, onMapClick, selectedMillCoords, mapContainerRef, selectedMillId, sidebarRef }: MillMapProps) => {
  const t = useTranslations();

  // Center of Portugal (approximate geographic center)
  const portugalCenter: LatLngExpression = [39.5, -8.0];
  const defaultZoom = 7;

  return (
    <div ref={mapContainerRef} className="relative h-full w-full">
      <MapContainer
        center={portugalCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Manual Zoom Control at top-right */}
        <ZoomControl position="topright" />

        {/* OpenStreetMap tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map click handler for closing postal card */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* Map resize handler - ensures map resizes when container size changes */}
        <MapResizeHandler />

        {/* Focus zoom handler - automatically centers and zooms to selected mill at 50% viewport width */}
        {selectedMillCoords && (
          <FocusZoomHandler 
            lat={selectedMillCoords.lat} 
            lng={selectedMillCoords.lng}
          />
        )}

        {/* Connection line from sidebar bottom to marker */}
        {selectedMillCoords && sidebarRef && (
          <ConnectionLine
            millCoords={selectedMillCoords}
            sidebarRef={sidebarRef}
          />
        )}

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
                <h3 className="font-semibold text-sm mb-2">{waterLine.name}</h3>
                <Link
                  href={`/${locale}/levada/${waterLine.slug}`}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {t('map.viewDetails')}
                </Link>
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
          const isSelected = selectedMillId === mill.id;
          const isGreyedOut = selectedMillId !== null && !isSelected;
          
          // Phase 5.9.8: Use DynamicSVGMarker for async SVG tinting with Levada colors
          // Uses global template (mill.svg) and tints it with the associated Levada's color
          return (
            <DynamicSVGMarker
              key={mill.id}
              mill={mill}
              position={position}
              isSelected={isSelected}
              isGreyedOut={isGreyedOut}
              eventHandlers={{
                click: (e) => {
                  // Prevent map background click from firing
                  e.originalEvent.stopPropagation();
                  // Call onMillClick callback if provided
                  if (onMillClick) {
                    onMillClick(mill.id);
                  }
                },
              }}
            />
          );
        })}
      </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

