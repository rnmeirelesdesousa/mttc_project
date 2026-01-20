/**
 * Map Icons Utility
 * 
 * Provides helper functions for creating Leaflet icons for mill markers.
 * Custom icons are stored in the 'map-assets' bucket in Supabase Storage.
 */

import L from 'leaflet';

// Default Leaflet icon URLs (CDN fallback)
const DEFAULT_ICON_RETINA_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
const DEFAULT_ICON_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
const DEFAULT_SHADOW_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

/**
 * Gets the public CDN URL for a custom icon stored in Supabase Storage
 * 
 * @param customUrl - Public URL to the custom icon (already a full URL from Supabase Storage)
 * @returns The custom URL as-is, or null if not provided
 */
function getCustomIconUrl(customUrl: string | null | undefined): string | null {
  if (!customUrl || customUrl.trim() === '') {
    return null;
  }
  return customUrl;
}

/**
 * Creates a Leaflet icon for a mill marker
 * 
 * If a custom icon URL is provided, uses that icon. Otherwise, uses the default Leaflet marker.
 * 
 * @param customIconUrl - Optional custom icon URL from Supabase Storage 'map-assets' bucket
 * @param isSelected - Whether this marker is currently selected (makes it larger)
 * @param isGreyedOut - Whether this marker should be greyed out (when another is selected)
 * @returns Leaflet L.Icon instance
 */
export function getMillIcon(customIconUrl?: string | null, isSelected?: boolean, isGreyedOut?: boolean): L.Icon {
  const customUrl = getCustomIconUrl(customIconUrl);
  
  // Scale factor for selected markers (1.5x larger)
  const scale = isSelected ? 1.5 : 1;
  const iconSize: [number, number] = [Math.round(25 * scale), Math.round(41 * scale)];
  const iconAnchor: [number, number] = [Math.round(12 * scale), Math.round(41 * scale)];
  const popupAnchor: [number, number] = [Math.round(1 * scale), Math.round(-34 * scale)];
  const shadowSize: [number, number] = [Math.round(41 * scale), Math.round(41 * scale)];
  const shadowAnchor: [number, number] = [Math.round(12 * scale), Math.round(41 * scale)];

  // Add className for CSS styling when greyed out
  const className = isGreyedOut ? 'mill-marker-greyed-out' : '';

  if (customUrl) {
    // Use custom icon
    return L.icon({
      iconUrl: customUrl,
      iconRetinaUrl: customUrl, // Use same URL for retina (or provide separate if available)
      iconSize,
      iconAnchor,
      popupAnchor,
      shadowUrl: DEFAULT_SHADOW_URL,
      shadowSize,
      shadowAnchor,
      className,
    });
  }

  // Use default Leaflet icon
  return L.icon({
    iconRetinaUrl: DEFAULT_ICON_RETINA_URL,
    iconUrl: DEFAULT_ICON_URL,
    shadowUrl: DEFAULT_SHADOW_URL,
    iconSize,
    iconAnchor,
    popupAnchor,
    shadowSize,
    shadowAnchor,
    className,
  });
}

/**
 * Gets the icon color for a construction type
 * 
 * Phase 5.9.7: Returns a color code for different construction types on the map
 * 
 * @param typeCategory - Construction type category ('MILL', 'POCA', etc.)
 * @returns Hex color code for the construction type
 */
export function getConstructionTypeColor(typeCategory: string): string {
  switch (typeCategory) {
    case 'POCA':
      return '#10b981'; // Green color for poças (water pools)
    case 'MILL':
      return '#3b82f6'; // Blue color for mills (default)
    default:
      return '#3b82f6'; // Default blue
  }
}

/**
 * Creates a Leaflet icon for a poça marker
 * 
 * Phase 5.9.7: Uses a green-colored marker to distinguish poças from mills
 * 
 * @param customIconUrl - Optional custom icon URL from Supabase Storage 'map-assets' bucket
 * @returns Leaflet L.Icon instance
 */
export function getPocaIcon(customIconUrl?: string | null): L.Icon {
  const customUrl = getCustomIconUrl(customIconUrl);

  if (customUrl) {
    // Use custom icon
    return L.icon({
      iconUrl: customUrl,
      iconRetinaUrl: customUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: DEFAULT_SHADOW_URL,
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    });
  }

  // Use default Leaflet icon (will be styled with CSS or colored marker in map component)
  // For now, return the default icon - the map component can apply color styling
  return L.icon({
    iconRetinaUrl: DEFAULT_ICON_RETINA_URL,
    iconUrl: DEFAULT_ICON_URL,
    shadowUrl: DEFAULT_SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });
}
