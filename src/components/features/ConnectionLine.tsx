'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

interface ConnectionLineProps {
  millCoords: { lat: number; lng: number } | null;
  sidebarRef: React.RefObject<HTMLDivElement> | null;
}

/**
 * ConnectionLine Component
 * 
 * Draws a visually pleasant curved line connecting a map marker to the sidebar.
 * Uses SVG overlay positioned absolutely over the map.
 */
export const ConnectionLine = ({ millCoords, sidebarRef }: ConnectionLineProps) => {
  const map = useMap();
  const [markerPoint, setMarkerPoint] = useState<{ x: number; y: number } | null>(null);
  const [sidebarPoint, setSidebarPoint] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update positions when map moves, zooms, or coords change
  useEffect(() => {
    if (!millCoords || !sidebarRef?.current) {
      setMarkerPoint(null);
      setSidebarPoint(null);
      return;
    }

    const updatePositions = () => {
      // Check if sidebar ref is still available
      if (!sidebarRef?.current) {
        setMarkerPoint(null);
        setSidebarPoint(null);
        return;
      }

      // Get marker position in container coordinates
      const markerLatLng: LatLngExpression = [millCoords.lat, millCoords.lng];
      const markerContainerPoint = map.latLngToContainerPoint(markerLatLng);
      
      // Get sidebar position
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const mapContainer = map.getContainer();
      if (!mapContainer) {
        setMarkerPoint(null);
        setSidebarPoint(null);
        return;
      }
      const mapRect = mapContainer.getBoundingClientRect();
      
      // Calculate sidebar bottom edge points relative to map container
      // The sidebar is positioned at 75vw (right side), so we extend from the LEFT edge
      const sidebarBottomLeftX = sidebarRect.left - mapRect.left;
      const sidebarBottomY = sidebarRect.bottom - mapRect.top;
      
      // Use the sidebar's bottom Y coordinate for both points to ensure perfectly horizontal line
      // This is the extension of the bottom blue border (4px thick)
      const horizontalY = sidebarBottomY;
      
      // Determine which direction to draw the line
      // If marker is to the left of sidebar, start from sidebar left edge
      // If marker is to the right of sidebar, start from sidebar right edge
      const markerX = markerContainerPoint.x;
      const sidebarRightX = sidebarRect.right - mapRect.left;
      
      // Start point: left edge of sidebar bottom (where border ends)
      // End point: marker X position at same Y level
      const startX = markerX < sidebarBottomLeftX ? sidebarBottomLeftX : sidebarRightX;
      
      setSidebarPoint({
        x: startX,
        y: horizontalY, // Bottom border Y coordinate
      });
      
      setMarkerPoint({
        x: markerX,
        y: horizontalY, // Same Y as sidebar bottom for perfect horizontal line
      });
    };

    updatePositions();

    // Update on map move/zoom
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);

    // Also update on window resize
    const handleResize = () => {
      setTimeout(updatePositions, 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      map.off('move', updatePositions);
      map.off('zoom', updatePositions);
      map.off('resize', updatePositions);
      window.removeEventListener('resize', handleResize);
    };
  }, [map, millCoords, sidebarRef]);

  // Update SVG size to match map container
  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const updateSize = () => {
      const mapContainer = map.getContainer();
      const rect = mapContainer.getBoundingClientRect();
      if (containerRef.current && svgRef.current) {
        containerRef.current.style.width = `${rect.width}px`;
        containerRef.current.style.height = `${rect.height}px`;
        svgRef.current.setAttribute('width', `${rect.width}`);
        svgRef.current.setAttribute('height', `${rect.height}`);
      }
    };

    updateSize();
    map.on('resize', updateSize);
    window.addEventListener('resize', updateSize);

    return () => {
      map.off('resize', updateSize);
      window.removeEventListener('resize', updateSize);
    };
  }, [map]);

  if (!markerPoint || !sidebarPoint) {
    return null;
  }

  // Create straight line path
  const pathData = `M ${markerPoint.x} ${markerPoint.y} L ${sidebarPoint.x} ${sidebarPoint.y}`;

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 pointer-events-none z-[998]"
      style={{ width: '100%', height: '100%' }}
    >
      <svg
        ref={svgRef}
        className="absolute top-0 left-0"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* Subtle shadow for depth */}
          <filter id="connectionShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx="0.5" dy="0.5" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.2" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Main connection line - horizontal line from sidebar bottom to marker */}
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="1"
          filter="url(#connectionShadow)"
          style={{
            transition: 'd 0.2s ease-out',
          }}
        />
      </svg>
    </div>
  );
};
