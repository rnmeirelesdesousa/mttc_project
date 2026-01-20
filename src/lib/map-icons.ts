/**
 * Map Icons Utility
 * 
 * Provides helper functions for creating Leaflet icons for mill markers.
 * 
 * Phase 5.9.8: Uses global marker templates (mill.svg, poca.svg) from the 'map-assets' bucket.
 * Supports dynamic SVG marker tinting based on associated Levada color.
 * Implements caching to avoid re-fetching the same SVG templates.
 */

import L from 'leaflet';

// Phase 5.9.8: Cache for raw SVG templates to avoid re-fetching
const svgTemplateCache = new Map<string, string>();
// Cache for tinted SVG results (key: `${type}-${color}`)
const tintedSvgCache = new Map<string, string>();

/**
 * Gets the Supabase Storage URL for a marker template
 * 
 * @param type - Construction type ('mill' | 'poca')
 * @returns Full URL to the SVG template
 */
function getTemplateUrl(type: 'mill' | 'poca'): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const templateName = type === 'mill' ? 'mill.svg' : 'poca.svg';
  console.log('[MapIcons] Using template from /svg/ folder for', type);
  return `${baseUrl}/storage/v1/object/public/map-assets/svg/${templateName}`;
}

// Default Leaflet icon URLs (CDN fallback)
const DEFAULT_ICON_RETINA_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
const DEFAULT_ICON_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
const DEFAULT_SHADOW_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';


/**
 * Fetches an SVG template from cache or storage
 * 
 * Phase 5.9.8: Implements caching to avoid re-fetching the same SVG templates.
 * 
 * @param type - Construction type ('mill' | 'poca')
 * @returns Promise resolving to the raw SVG text, or null on error
 */
async function fetchSVGTemplate(type: 'mill' | 'poca'): Promise<string | null> {
  // Check cache first
  if (svgTemplateCache.has(type)) {
    return svgTemplateCache.get(type)!;
  }

  try {
    const templateUrl = getTemplateUrl(type);
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      console.error(`[fetchSVGTemplate]: Failed to fetch ${type} template:`, response.statusText);
      return null;
    }

    const svgText = await response.text();
    
    // Cache the SVG text
    svgTemplateCache.set(type, svgText);
    
    return svgText;
  } catch (error) {
    console.error(`[fetchSVGTemplate]: Error fetching ${type} template:`, error);
    return null;
  }
}

/**
 * Fetches an SVG template and applies a fill color to it using surgical ID-based tinting
 * 
 * Phase 5.9.8: Used to dynamically tint SVG markers with Levada colors.
 * Uses DOM-based approach to target specific IDs (#marker-fill and #marker-lines).
 * Caches tinted results for performance.
 * 
 * @param type - Construction type ('mill' | 'poca')
 * @param fillColor - Hex color code to apply (e.g., '#3b82f6')
 * @returns Promise resolving to a data URL of the tinted SVG, or null on error
 */
export async function fetchAndTintSVG(type: 'mill' | 'poca', fillColor: string): Promise<string | null> {
  try {
    // Check cache for tinted result first
    const cacheKey = `${type}-${fillColor}`;
    if (tintedSvgCache.has(cacheKey)) {
      const cachedTintedSvg = tintedSvgCache.get(cacheKey)!;
      const blob = new Blob([cachedTintedSvg], { type: 'image/svg+xml' });
      const dataUrl = URL.createObjectURL(blob);
      console.log('[fetchAndTintSVG] Using cached tinted SVG for', cacheKey);
      return dataUrl;
    }

    // Fetch the SVG template (from cache if available)
    const svgText = await fetchSVGTemplate(type);
    
    if (!svgText) {
      console.error('[fetchAndTintSVG] Failed to fetch SVG template for', type);
      return null;
    }
    
    console.log('[fetchAndTintSVG] Fetched SVG template for', type, 'length:', svgText.length);
    
    // Parse SVG using DOMParser for surgical tinting
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    
    // Check for parsing errors
    const parserError = svgDoc.querySelector('parsererror');
    if (parserError) {
      console.error('[fetchAndTintSVG]: SVG parsing error:', parserError.textContent);
      return null;
    }

    // Target #marker-fill: Update its fill attribute (do NOT change opacity)
    const markerFill = svgDoc.querySelector('#marker-fill');
    if (markerFill) {
      markerFill.setAttribute('fill', fillColor);
      // Preserve existing opacity if present, otherwise don't add one
    }

    // Target #marker-lines: Update its fill and/or stroke attributes
    const markerLines = svgDoc.querySelector('#marker-lines');
    if (markerLines) {
      markerLines.setAttribute('fill', fillColor);
      markerLines.setAttribute('stroke', fillColor);
    }

    // Serialize back to string
    const serializer = new XMLSerializer();
    const tintedSVG = serializer.serializeToString(svgDoc);

    // Cache the tinted SVG string
    tintedSvgCache.set(cacheKey, tintedSVG);

    // Convert to data URL
    const blob = new Blob([tintedSVG], { type: 'image/svg+xml' });
    const dataUrl = URL.createObjectURL(blob);
    
    console.log('[fetchAndTintSVG] Created tinted SVG data URL for', cacheKey);
    return dataUrl;
  } catch (error) {
    console.error('[fetchAndTintSVG]: Error processing SVG:', error);
    return null;
  }
}

/**
 * Creates a Leaflet icon for a marker (synchronous version)
 * 
 * Phase 5.9.8: Returns a transparent placeholder icon that will be updated asynchronously with tinted SVG.
 * Uses L.divIcon to avoid showing default Leaflet blue pin while loading.
 * 
 * @param type - Construction type ('mill' | 'poca')
 * @param isSelected - Whether this marker is currently selected (makes it larger)
 * @param isGreyedOut - Whether this marker should be greyed out (when another is selected)
 * @returns Leaflet L.DivIcon instance (transparent placeholder, will be updated asynchronously)
 */
export function getMarkerIcon(
  type: 'mill' | 'poca' = 'mill',
  isSelected?: boolean,
  isGreyedOut?: boolean
): L.DivIcon {
  // Scale factor for selected markers (1.5x larger)
  const scale = isSelected ? 1.5 : 1;
  const iconSize: [number, number] = [Math.round(25 * scale), Math.round(41 * scale)];
  const iconAnchor: [number, number] = [Math.round(12 * scale), Math.round(41 * scale)];
  const popupAnchor: [number, number] = [Math.round(1 * scale), Math.round(-34 * scale)];

  // Add className for CSS styling when greyed out
  const className = isGreyedOut ? 'mill-marker-greyed-out bg-transparent' : 'bg-transparent';

  // Use transparent div icon as placeholder (will be replaced by tinted SVG)
  // This ensures no blue pin appears while loading
  // Use a minimal invisible div so Leaflet creates a proper DOM element
  return L.divIcon({
    className,
    html: '<div style="width: 1px; height: 1px; opacity: 0;"></div>',
    iconSize,
    iconAnchor,
    popupAnchor,
  });
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getMarkerIcon instead
 */
export function getMillIcon(
  customIconUrl?: string | null,
  isSelected?: boolean,
  isGreyedOut?: boolean,
  waterLineColor?: string | null
): L.Icon {
  return getMarkerIcon('mill', isSelected, isGreyedOut);
}

/**
 * Creates a Leaflet icon for a marker with async SVG tinting
 * 
 * Phase 5.9.8: Uses global marker templates and tints them with Levada colors.
 * Defaults to neutral color (#4B5563) if no water line color is provided.
 * 
 * @param type - Construction type ('mill' | 'poca')
 * @param isSelected - Whether this marker is currently selected (makes it larger)
 * @param isGreyedOut - Whether this marker should be greyed out (when another is selected)
 * @param waterLineColor - Optional hex color code from associated Levada for SVG tinting
 * @returns Promise resolving to Leaflet L.Icon instance
 */
export async function getMarkerIconAsync(
  type: 'mill' | 'poca' = 'mill',
  isSelected?: boolean,
  isGreyedOut?: boolean,
  waterLineColor?: string | null
): Promise<L.Icon> {
  // Scale factor for selected markers (1.5x larger)
  const scale = isSelected ? 1.5 : 1;
  const iconSize: [number, number] = [Math.round(25 * scale), Math.round(41 * scale)];
  const iconAnchor: [number, number] = [Math.round(12 * scale), Math.round(41 * scale)];
  const popupAnchor: [number, number] = [Math.round(1 * scale), Math.round(-34 * scale)];
  const shadowSize: [number, number] = [Math.round(41 * scale), Math.round(41 * scale)];
  const shadowAnchor: [number, number] = [Math.round(12 * scale), Math.round(41 * scale)];

  // Add className for CSS styling when greyed out
  const className = isGreyedOut ? 'mill-marker-greyed-out' : '';

  // Phase 5.9.8: Use neutral color if no water line color is provided
  const fillColor = waterLineColor || '#4B5563'; // Neutral gray color

  // Fetch and tint the SVG template
  const tintedSvgUrl = await fetchAndTintSVG(type, fillColor);
  
  if (tintedSvgUrl) {
    console.log('[getMarkerIconAsync] Successfully created icon for', type, 'with color', fillColor);
    return L.icon({
      iconUrl: tintedSvgUrl,
      iconRetinaUrl: tintedSvgUrl,
      iconSize,
      iconAnchor,
      popupAnchor,
      shadowUrl: DEFAULT_SHADOW_URL,
      shadowSize,
      shadowAnchor,
      className,
    });
  }

  // Fallback to transparent div icon if tinting fails (no blue pin)
  console.warn('[getMarkerIconAsync] Tinting failed, using transparent fallback for', type);
  return L.divIcon({
    className: className || 'bg-transparent',
    html: '<div style="width: 1px; height: 1px; opacity: 0;"></div>',
    iconSize,
    iconAnchor,
    popupAnchor,
  });
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getMarkerIconAsync instead
 */
export async function getMillIconAsync(
  customIconUrl?: string | null,
  isSelected?: boolean,
  isGreyedOut?: boolean,
  waterLineColor?: string | null
): Promise<L.Icon> {
  return getMarkerIconAsync('mill', isSelected, isGreyedOut, waterLineColor);
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
 * Legacy function for poça icons
 * @deprecated Use getMarkerIcon or getMarkerIconAsync instead
 */
export function getPocaIcon(customIconUrl?: string | null): L.Icon {
  return getMarkerIcon('poca');
}
