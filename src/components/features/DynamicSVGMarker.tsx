'use client';

import { useEffect, useRef } from 'react';
import { Marker, MarkerProps } from 'react-leaflet';
import { getMarkerIcon, getMarkerIconAsync } from '@/lib/map-icons';
import type { PublishedMill } from '@/actions/public';
import L from 'leaflet';

/**
 * DynamicSVGMarker Component
 * 
 * Phase 5.9.8: A wrapper around Leaflet Marker that handles async SVG icon tinting.
 * Uses global marker templates (mill.svg or poca.svg) and tints them with Levada colors.
 * 
 * This component:
 * 1. Starts with a default/synchronous placeholder icon
 * 2. Fetches the appropriate template (mill.svg or poca.svg) and tints it asynchronously
 * 3. Updates the marker icon when tinting completes
 * 
 * This ensures markers appear immediately while the tinted SVG loads in the background.
 */
interface DynamicSVGMarkerProps extends Omit<MarkerProps, 'icon'> {
  mill: PublishedMill;
  type?: 'mill' | 'poca'; // Construction type, defaults to 'mill'
  isSelected?: boolean;
  isGreyedOut?: boolean;
}

export function DynamicSVGMarker({ mill, type = 'mill', isSelected, isGreyedOut, ...markerProps }: DynamicSVGMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const iconUpdateInProgress = useRef(false);
  
  // Extract ref from props if it exists (using type assertion since ref is special)
  const forwardedRef = (markerProps as any).ref;

  // Update icon when dependencies change (but only if marker is already mounted)
  useEffect(() => {
    if (!markerRef.current || iconUpdateInProgress.current) {
      return;
    }

    iconUpdateInProgress.current = true;
    
    getMarkerIconAsync(
      type,
      false,
      isGreyedOut,
      mill.waterLineColor || null
    ).then((tintedIcon) => {
      if (markerRef.current) {
        markerRef.current.setIcon(tintedIcon);
        console.log('[DynamicSVGMarker] Icon updated for mill:', mill.id, 'type:', type);
        if (isSelected) {
          const element = markerRef.current.getElement();
          if (element) {
            element.style.filter = 'drop-shadow(0 0 5px gold) brightness(1.2)';
          }
        }
      }
      iconUpdateInProgress.current = false;
    }).catch((error) => {
      console.error('[DynamicSVGMarker]: Error loading tinted icon:', error);
      iconUpdateInProgress.current = false;
    });
  }, [type, mill.waterLineColor, isGreyedOut, isSelected, mill.id]);

  // Get initial icon (synchronous placeholder) - don't pass isSelected
  const initialIcon = getMarkerIcon(type, false, isGreyedOut);

  // Apply CSS filter for selection
  useEffect(() => {
    if (markerRef.current) {
      const element = markerRef.current.getElement();
      if (element) {
        if (isSelected) {
          element.style.filter = 'drop-shadow(0 0 5px gold) brightness(1.2)';
        } else {
          element.style.filter = '';
        }
      }
    }
  }, [isSelected]);

  return (
    <Marker
      {...markerProps}
      ref={(ref) => {
        markerRef.current = ref;
        // Handle forwarded ref if provided
        if (typeof forwardedRef === 'function') {
          forwardedRef(ref);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<L.Marker | null>).current = ref;
        }
        // Apply filter immediately if selected
        if (ref && isSelected) {
          const element = ref.getElement();
          if (element) {
            element.style.filter = 'drop-shadow(0 0 5px gold) brightness(1.2)';
          }
        }
        // Trigger icon update when marker is mounted (initial load)
        if (ref && !iconUpdateInProgress.current) {
          // Use setTimeout to ensure marker is fully initialized
          setTimeout(() => {
            if (markerRef.current && !iconUpdateInProgress.current) {
              iconUpdateInProgress.current = true;
              getMarkerIconAsync(
                type,
                false,
                isGreyedOut,
                mill.waterLineColor || null
              ).then((tintedIcon) => {
                if (markerRef.current) {
                  markerRef.current.setIcon(tintedIcon);
                  console.log('[DynamicSVGMarker] Icon updated on mount for mill:', mill.id);
                  if (isSelected) {
                    const element = markerRef.current.getElement();
                    if (element) {
                      element.style.filter = 'drop-shadow(0 0 5px gold) brightness(1.2)';
                    }
                  }
                }
                iconUpdateInProgress.current = false;
              }).catch((error) => {
                console.error('[DynamicSVGMarker]: Error loading tinted icon on mount:', error);
                iconUpdateInProgress.current = false;
              });
            }
          }, 0);
        }
      }}
      icon={initialIcon}
    />
  );
}
