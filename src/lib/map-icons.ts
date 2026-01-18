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
 * @returns Leaflet L.Icon instance
 */
export function getMillIcon(customIconUrl?: string | null): L.Icon {
  const customUrl = getCustomIconUrl(customIconUrl);

  if (customUrl) {
    // Use custom icon
    return L.icon({
      iconUrl: customUrl,
      iconRetinaUrl: customUrl, // Use same URL for retina (or provide separate if available)
      iconSize: [25, 41], // Default Leaflet marker size
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: DEFAULT_SHADOW_URL,
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    });
  }

  // Use default Leaflet icon
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
