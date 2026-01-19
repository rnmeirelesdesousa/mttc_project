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
 * Uses flyTo animation for smooth transition.
 * Also calculates card position.
 */
function FocusZoomHandler({ 
  lat, lng, onCardPositionUpdate, mapContainerRef 
}: { 
  lat: number | null; 
  lng: number | null; 
  onCardPositionUpdate?: (position: { top: number; left: number } | null) => void; 
  mapContainerRef?: React.RefObject<HTMLDivElement> 
}) {
  const map = useMap();

  useEffect(() => {
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      // First, fly to the marker location
      map.flyTo([lat, lng], 18, {
        animate: true,
        duration: 1.5,
      });
      
      // After animation completes, pan to center marker in left half and position card on right
      const checkAndPan = () => {
        const point = map.latLngToContainerPoint([lat, lng]);
        const mapSize = map.getSize();
        
        // Card dimensions (3:2 ratio, max 90vh)
        const cardWidth = 600;
        const maxCardHeight = Math.min(400, mapSize.y * 0.9);
        const cardHeight = maxCardHeight;
        
        // Goal: Center marker in left half of screen
        // Left half center is at mapSize.x / 4
        const targetMarkerX = mapSize.x / 4;
        
        // Calculate pan needed to center marker in left half
        const panX = targetMarkerX - point.x;
        
        // Position card on right half, vertically centered
        // Card should be on the right side, starting around mapSize.x / 2
        const cardLeft = mapSize.x / 2 + 20; // Start card at middle + small margin
        const cardTop = (mapSize.y - cardHeight) / 2; // Vertically centered
        
        // Ensure card doesn't go off screen
        const padding = { top: 20, right: 20, bottom: 20, left: 100 };
        let finalPanX = panX;
        let finalPanY = 0;
        
        // Adjust if card would go off right edge
        const adjustedCardLeft = cardLeft + panX; // Account for pan
        if (adjustedCardLeft + cardWidth > mapSize.x - padding.right) {
          finalPanX = (mapSize.x - padding.right) - (cardLeft + cardWidth);
        }
        
        // Ensure marker stays visible (with padding for filter button)
        if (point.x + finalPanX < padding.left) {
          finalPanX = padding.left - point.x;
        }
        
        // Vertically center the card, but ensure it doesn't go off screen
        const adjustedCardTop = cardTop; // Card top is already centered
        if (adjustedCardTop < padding.top) {
          finalPanY = padding.top - adjustedCardTop;
        } else if (adjustedCardTop + cardHeight > mapSize.y - padding.bottom) {
          finalPanY = (mapSize.y - padding.bottom) - (adjustedCardTop + cardHeight);
        }
        
        // Also ensure marker is vertically visible
        const markerYAfterPan = point.y + finalPanY;
        if (markerYAfterPan < padding.top) {
          finalPanY = Math.max(finalPanY, padding.top - point.y);
        } else if (markerYAfterPan > mapSize.y - padding.bottom) {
          finalPanY = Math.min(finalPanY, (mapSize.y - padding.bottom) - point.y);
        }
        
        // Apply pan if needed
        if (finalPanX !== 0 || finalPanY !== 0) {
          map.panBy([finalPanX, finalPanY], { animate: true, duration: 0.5 });
          // Position will be updated via the move event listener in the other useEffect
        }
      };
      
      // Wait for flyTo animation to complete, then check and pan
      setTimeout(checkAndPan, 1600);
    }
  }, [map, lat, lng]);

  // Calculate and update card position
  useEffect(() => {
    if (!onCardPositionUpdate || !mapContainerRef?.current) return;
    
    const updatePosition = () => {
      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        onCardPositionUpdate(null);
        return;
      }

      const mapContainer = mapContainerRef.current;
      if (!mapContainer) return;

      const mapElement = mapContainer.querySelector('.leaflet-container') as HTMLElement;
      if (!mapElement) return;

      const mapRect = mapElement.getBoundingClientRect();
      const containerRect = mapContainer.getBoundingClientRect();

      // Card dimensions (3:2 ratio, max 90vh)
      const cardWidth = 600;
      const maxCardHeight = Math.min(400, mapRect.height * 0.9);
      const cardHeight = maxCardHeight;

      // Position card on right half, vertically centered
      const cardLeft = mapRect.width / 2 + 20; // Start at middle + small margin
      const cardTop = (mapRect.height - cardHeight) / 2; // Vertically centered

      // Ensure card doesn't go off screen
      const padding = { top: 20, right: 20, bottom: 20, left: 100 };
      
      let left = cardLeft;
      let top = cardTop;

      // Clamp to screen bounds
      if (left + cardWidth > mapRect.width - padding.right) {
        left = mapRect.width - cardWidth - padding.right;
      }
      if (left < padding.left) {
        left = padding.left;
      }
      if (top < padding.top) {
        top = padding.top;
      }
      if (top + cardHeight > mapRect.height - padding.bottom) {
        top = mapRect.height - cardHeight - padding.bottom;
      }

      onCardPositionUpdate({
        top: top + (mapRect.top - containerRect.top),
        left: left + (mapRect.left - containerRect.left),
      });
    };

    updatePosition();
    
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);
    map.on('resize', updatePosition);
    
    const timeoutId = setTimeout(updatePosition, 100);

    return () => {
      clearTimeout(timeoutId);
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
      map.off('resize', updatePosition);
    };
  }, [map, lat, lng, onCardPositionUpdate, mapContainerRef]);

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
  onCardPositionUpdate?: (position: { top: number; left: number } | null) => void;
  mapContainerRef?: React.RefObject<HTMLDivElement>;
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
export const MillMap = ({ mills, waterLines, locale, onMillClick, onMapClick, selectedMillCoords, onCardPositionUpdate, mapContainerRef }: MillMapProps) => {
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

        {/* Focus zoom handler - automatically centers and zooms to selected mill */}
        {selectedMillCoords && (
          <FocusZoomHandler 
            lat={selectedMillCoords.lat} 
            lng={selectedMillCoords.lng}
            onCardPositionUpdate={onCardPositionUpdate}
            mapContainerRef={mapContainerRef}
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
          
          // Get custom icon if available (Phase 5.9.2.4)
          const customIcon = getMillIcon(mill.customIconUrl);

          return (
            <Marker
              key={mill.id}
              position={position}
              icon={customIcon}
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

