'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap, ZoomControl, LayersControl } from 'react-leaflet';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { PublishedMill, PublishedPoca, MapWaterLine } from '@/actions/public';
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
 * Centers the marker at 33% of the viewport width (1/3 from the left).
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
      // Use maxZoom of Stadia Alidade Satellite (20)
      const zoomLevel = 20;
      const targetLatLng = L.latLng(lat, lng);
      
      // Calculate the adjusted center point before animation
      // We need to offset the center so marker appears at 33% from left instead of 50% (center)
      const containerWidth = map.getContainer().offsetWidth;
      const offsetPixels = containerWidth * 0.17; // 17% offset (50% - 33%)
      
      // Temporarily set zoom to target level and center at target location (without animation)
      // to calculate the lat/lng offset at the actual target location
      const currentZoom = map.getZoom();
      const currentCenter = map.getCenter();
      map.setView(targetLatLng, zoomLevel, { animate: false });
      
      // At target zoom with center at targetLatLng, calculate the offset
      // Get center in pixels (should be at 50% of viewport)
      const centerPixel = map.latLngToContainerPoint(targetLatLng);
      
      // Calculate offset center pixel (move right by offsetPixels)
      const offsetCenterPixel = L.point(centerPixel.x + offsetPixels, centerPixel.y);
      
      // Convert offset center pixel back to lat/lng - this is our adjusted center
      const adjustedCenter = map.containerPointToLatLng(offsetCenterPixel);
      
      // Reset zoom and center to current state before animation
      map.setView(currentCenter, currentZoom, { animate: false });
      
      // Now fly directly to the adjusted center
      map.flyTo(adjustedCenter, zoomLevel, {
        animate: true,
        duration: 3.0,
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

/**
 * WaterLinesRenderer Component
 * 
 * Renders water lines only when zoom level is 15 or higher.
 * This improves performance and reduces visual clutter at lower zoom levels.
 */
function WaterLinesRenderer({ 
  waterLines, 
  locale 
}: { 
  waterLines: MapWaterLine[]; 
  locale: string;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const t = useTranslations();

  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
    };

    map.on('zoomend', updateZoom);
    updateZoom(); // Initial zoom level

    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  // Only render water lines at zoom level 15 or higher
  if (zoom < 15) {
    return null;
  }

  return (
    <>
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
    </>
  );
}

/**
 * SmartFitBounds Component
 * 
 * Intelligently fits map bounds to show constructions (mills/pocas) only if they are clustered.
 * - Starts with Portugal center and default zoom
 * - Only zooms if constructions are clustered (not spread across all of Portugal)
 * - Uses gentle zoom with padding to avoid zooming too much
 */
function SmartFitBounds({ 
  mills, 
  pocas,
  portugalCenter,
  defaultZoom 
}: { 
  mills: PublishedMill[]; 
  pocas: PublishedPoca[];
  portugalCenter: LatLngExpression;
  defaultZoom: number;
}) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    // Only fit bounds once on initial load
    if (hasFitted.current) return;

    // Collect all construction coordinates
    const allCoords: [number, number][] = [];

    // Add mill coordinates
    mills.forEach((mill) => {
      if (mill.lat !== null && mill.lng !== null && !isNaN(mill.lat) && !isNaN(mill.lng)) {
        allCoords.push([mill.lat, mill.lng]);
      }
    });

    // Add poca coordinates
    pocas.forEach((poca) => {
      if (poca.lat !== null && poca.lng !== null && !isNaN(poca.lat) && !isNaN(poca.lng)) {
        allCoords.push([poca.lat, poca.lng]);
      }
    });

    // Need at least 2 points to calculate meaningful bounds
    if (allCoords.length < 2) {
      hasFitted.current = true;
      return;
    }

    // Calculate bounds of constructions
    const bounds = L.latLngBounds(allCoords);
    const boundsLatSpan = bounds.getNorth() - bounds.getSouth();
    const boundsLngSpan = bounds.getEast() - bounds.getWest();

    // Portugal's approximate dimensions (in degrees)
    // North: ~42.2°N, South: ~36.8°N (span ~5.4°)
    // West: ~9.5°W, East: ~6.2°W (span ~3.3°)
    const portugalLatSpan = 42.2 - 36.8; // ~5.4 degrees
    const portugalLngSpan = -6.2 - (-9.5); // ~3.3 degrees

    // Only zoom if constructions are clustered
    // Consider clustered if both lat and lng spans are less than 60% of Portugal's spans
    // This prevents zooming when constructions are spread across Portugal
    const clusteringThreshold = 0.6;
    const isClustered = 
      boundsLatSpan < portugalLatSpan * clusteringThreshold &&
      boundsLngSpan < portugalLngSpan * clusteringThreshold;

    if (isClustered) {
      // Add a small delay so users can see the map starts centered in Portugal
      // Then zoom with a slower, smoother animation to make the transition clear
      setTimeout(() => {
        // Use flyToBounds for smoother animation - it respects duration better than fitBounds
        // First expand bounds with padding
        const paddedBounds = bounds.pad(0.2); // Add 20% padding
        
        // Calculate the center and zoom level for the bounds
        const center = paddedBounds.getCenter();
        const zoom = map.getBoundsZoom(paddedBounds, false);
        const targetZoom = Math.min(zoom, 14); // Limit zoom to avoid zooming too close
        
        // Use flyTo for smooth, controlled animation with longer duration
        map.flyTo(center, targetZoom, {
          animate: true,
          duration: 4, // Longer duration for very smooth, gradual zoom movement
        });
      }, 800); // 800ms delay to show Portugal view first
    }

    hasFitted.current = true;
  }, [map, mills, pocas]);

  return null;
}

/**
 * ClusterZoomHandler Component
 * 
 * Handles cluster click events with slower zoom animation.
 * Overrides the default fast zoom with a smoother, slower animation.
 */
function ClusterZoomHandler({ 
  clusterGroupRef 
}: { 
  clusterGroupRef: React.RefObject<L.MarkerClusterGroup | null>;
}) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    const handleClusterClick = (e: L.LeafletEvent & { layer: L.MarkerCluster }) => {
      const cluster = e.layer;
      
      // Get the bounds of all markers in the cluster
      const bounds = cluster.getBounds();
      
      // Add padding to bounds
      const paddedBounds = bounds.pad(0.1);
      
      // Calculate center and zoom for the bounds
      const center = paddedBounds.getCenter();
      const zoom = map.getBoundsZoom(paddedBounds, false);
      const targetZoom = Math.min(zoom, 17); // Don't zoom past clustering disable point
      
      // Use flyTo for smooth, slower animation
      map.flyTo(center, targetZoom, {
        animate: true,
        duration: 2.5, // Slower animation for cluster zoom
      });
    };

    clusterGroup.on('clusterclick', handleClusterClick as L.LeafletEventHandlerFn);

    return () => {
      clusterGroup.off('clusterclick', handleClusterClick as L.LeafletEventHandlerFn);
    };
  }, [map, clusterGroupRef]);

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
  pocas?: PublishedPoca[];
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
export const MillMap = ({ mills, pocas = [], waterLines, locale, onMillClick, onMapClick, selectedMillCoords, mapContainerRef, selectedMillId, sidebarRef }: MillMapProps) => {
  const t = useTranslations();

  // Center of Portugal (approximate geographic center)
  const portugalCenter: LatLngExpression = [39.5, -8.0];
  const defaultZoom = 7;

  // Get API keys from environment variables
  const thunderforestApiKey = process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY;
  const stadiaApiKey = process.env.NEXT_PUBLIC_STADIA_API_KEY;

  // Ref for cluster group to attach custom event handlers
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  return (
    <div ref={mapContainerRef} className="relative h-full w-full">
      <MapContainer
        center={portugalCenter}
        zoom={defaultZoom}
        maxZoom={20}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Manual Zoom Control at top-right */}
        <ZoomControl position="topright" />

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

        {/* Map click handler for closing postal card */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* Map resize handler - ensures map resizes when container size changes */}
        <MapResizeHandler />

        {/* Smart fit bounds - zooms to constructions only if they are clustered */}
        <SmartFitBounds 
          mills={mills}
          pocas={pocas}
          portugalCenter={portugalCenter}
          defaultZoom={defaultZoom}
        />

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

      {/* Render water lines as polylines - only visible at zoom 15+ */}
      <WaterLinesRenderer waterLines={waterLines} locale={locale} />

      {/* Render markers for each mill with clustering (Phase 5.9.3) */}
      <ClusterZoomHandler clusterGroupRef={clusterGroupRef} />
      <MarkerClusterGroup
        ref={clusterGroupRef}
        chunkedLoading
        disableClusteringAtZoom={17}
        maxClusterRadius={50}
        zoomToBoundsOnClick={false}
        spiderfyOnMaxZoom={false}
        showCoverageOnHover={false}
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
              type="mill"
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
        {pocas.map((poca: PublishedPoca) => {
          // Skip pocas without valid coordinates
          if (!poca.lat || !poca.lng || isNaN(poca.lat) || isNaN(poca.lng)) {
            return null;
          }

          const position: LatLngExpression = [poca.lat, poca.lng];
          const isSelected = selectedMillId === poca.id;
          const isGreyedOut = selectedMillId !== null && !isSelected;
          
          // Phase 5.9.8: Use DynamicSVGMarker for async SVG tinting with Levada colors
          // Uses global template (poca.svg) and tints it with the associated Levada's color
          // Convert poca to mill-like object for DynamicSVGMarker compatibility
          const pocaAsMill = {
            ...poca,
            waterLineColor: poca.waterLineColor,
          } as PublishedMill;
          
          return (
            <DynamicSVGMarker
              key={poca.id}
              mill={pocaAsMill}
              type="poca"
              position={position}
              isSelected={isSelected}
              isGreyedOut={isGreyedOut}
              eventHandlers={{
                click: (e) => {
                  // Prevent map background click from firing
                  e.originalEvent.stopPropagation();
                  // Call onMillClick callback if provided (pocas can use the same handler)
                  if (onMillClick) {
                    onMillClick(poca.id);
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

