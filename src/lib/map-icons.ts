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

// Base marker size in pixels
const BASE_MARKER_SIZE = 70;

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

    // Target #marker-fill and #marker-lines
    const markerFill = svgDoc.querySelector('#marker-fill');
    const markerLines = svgDoc.querySelector('#marker-lines');

    // CRITICAL: Ensure marker-lines is rendered AFTER marker-fill in the DOM
    // In SVG, elements that appear later in the DOM are rendered on top
    // This ensures the lines are visible above the fill
    if (markerFill && markerLines) {
      const parent = markerFill.parentNode;
      if (parent && parent === markerLines.parentNode) {
        // Check current order
        let fillIndex = -1;
        let linesIndex = -1;
        const children = Array.from(parent.childNodes).filter(
          (node) => node.nodeType === Node.ELEMENT_NODE
        ) as Element[];

        children.forEach((child, index) => {
          if (child === markerFill) fillIndex = index;
          if (child === markerLines) linesIndex = index;
        });

        // If marker-fill comes after marker-lines (wrong order), reorder them
        if (fillIndex > linesIndex) {
          // Remove marker-lines from its current position
          markerLines.remove();
          // Insert it after marker-fill
          if (markerFill.nextSibling) {
            parent.insertBefore(markerLines, markerFill.nextSibling);
          } else {
            parent.appendChild(markerLines);
          }
          console.log('[fetchAndTintSVG] Reordered: marker-lines now comes after marker-fill');
        } else if (fillIndex < linesIndex) {
          console.log('[fetchAndTintSVG] Order is correct: marker-fill before marker-lines');
        }
      }
    }

    const markerFillOriginalState: {
      style: string | null;
      fill: string | null;
      fillOpacity: string | null;
      stroke: string | null;
      strokeWidth: string | null;
    } = {
      style: null,
      fill: null,
      fillOpacity: null,
      stroke: null,
      strokeWidth: null,
    };

    if (markerFill) {
      // Store ALL original attributes of marker-fill
      markerFillOriginalState.style = markerFill.getAttribute('style');
      markerFillOriginalState.fill = markerFill.getAttribute('fill');
      markerFillOriginalState.fillOpacity = markerFill.getAttribute('fill-opacity');
      markerFillOriginalState.stroke = markerFill.getAttribute('stroke');
      markerFillOriginalState.strokeWidth = markerFill.getAttribute('stroke-width');
    }

    // Target #marker-lines: Update its fill and/or stroke attributes to water line color
    // This is the only layer that should change color based on the connected water line
    if (markerLines) {
      // Find all child elements (paths, lines, circles, etc.) within the marker-lines group
      // These child elements may have inline styles that override the group's fill/stroke
      // IMPORTANT: Exclude marker-fill (it's a sibling, not a child, but be safe)
      const childElements = Array.from(markerLines.querySelectorAll('path, line, circle, rect, polyline, polygon'))
        .filter((el) => el.id !== 'marker-fill'); // Explicitly exclude marker-fill

      // Apply color to each child element (this overrides inline styles)
      childElements.forEach((child) => {
        // Get the original style before removing it (to preserve stroke-width and fill-rule)
        const originalStyle = child.getAttribute('style') || '';

        // Extract stroke-width from the original style if it exists
        let strokeWidth: string | null = null;
        if (originalStyle) {
          const strokeWidthMatch = originalStyle.match(/stroke-width:\s*([^;]+)/);
          if (strokeWidthMatch) {
            strokeWidth = strokeWidthMatch[1].trim();
          }
        }

        // Check if the original style has fill:none (it's a stroke-only line)
        // or if it has a fill color (it's a filled shape)
        const hasFillNone = originalStyle.includes('fill:none');
        const fillMatch = originalStyle.match(/fill:\s*([^;]+)/);
        const originalFill = fillMatch ? fillMatch[1].trim() : null;

        // Remove inline style attribute to allow our fill/stroke to take effect
        child.removeAttribute('style');

        // If the original had fill:none, it's a stroke-only line - keep fill="none" and change stroke
        // If the original had a fill color, it's a filled shape - change the fill color
        if (hasFillNone) {
          // This is a stroke-only line
          child.setAttribute('fill', 'none');
          child.setAttribute('stroke', fillColor);
          // Preserve stroke-width if it existed in the original style
          if (strokeWidth) {
            child.setAttribute('stroke-width', strokeWidth);
          }
        } else if (originalFill && originalFill !== 'none') {
          // This is a filled shape - change the fill color to the water line color
          child.setAttribute('fill', fillColor);
          // Preserve fill-rule if it existed
          const fillRuleMatch = originalStyle.match(/fill-rule:\s*([^;]+)/);
          if (fillRuleMatch) {
            child.setAttribute('fill-rule', fillRuleMatch[1].trim());
          }
          // If it also has a stroke, change that too
          if (originalStyle.includes('stroke:')) {
            child.setAttribute('stroke', fillColor);
            if (strokeWidth) {
              child.setAttribute('stroke-width', strokeWidth);
            }
          }
        } else {
          // Default: set both fill and stroke to the water line color
          child.setAttribute('fill', fillColor);
          child.setAttribute('stroke', fillColor);
          if (strokeWidth) {
            child.setAttribute('stroke-width', strokeWidth);
          }
        }
      });

      // Remove style from the group itself, but don't set fill/stroke on the group
      // because the children have different needs (some are filled, some are stroke-only)
      // Setting fill/stroke on the group would override the children's attributes
      markerLines.removeAttribute('style');

      console.log('[fetchAndTintSVG] Updated marker-lines with color:', fillColor, `(${childElements.length} child elements)`);
    } else {
      console.warn('[fetchAndTintSVG] #marker-lines element not found in SVG. Available elements:',
        Array.from(svgDoc.querySelectorAll('[id]')).map(el => el.id).join(', '));
    }

    // Restore marker-fill to its original state
    // Since marker-lines now uses fill="none", it won't affect marker-fill
    if (markerFill) {
      // Remove any attributes that might have been added during processing
      markerFill.removeAttribute('fill');
      markerFill.removeAttribute('fill-opacity');
      markerFill.removeAttribute('stroke');
      markerFill.removeAttribute('stroke-width');

      // Restore the original style attribute
      if (markerFillOriginalState.style !== null) {
        markerFill.setAttribute('style', markerFillOriginalState.style);
      } else {
        markerFill.removeAttribute('style');
      }

      // Restore individual attributes if they existed originally
      if (markerFillOriginalState.fill !== null) {
        markerFill.setAttribute('fill', markerFillOriginalState.fill);
      }
      if (markerFillOriginalState.fillOpacity !== null) {
        markerFill.setAttribute('fill-opacity', markerFillOriginalState.fillOpacity);
      }
      if (markerFillOriginalState.stroke !== null) {
        markerFill.setAttribute('stroke', markerFillOriginalState.stroke);
      }
      if (markerFillOriginalState.strokeWidth !== null) {
        markerFill.setAttribute('stroke-width', markerFillOriginalState.strokeWidth);
      }

      console.log('[fetchAndTintSVG] Restored marker-fill to original state');
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
  // Calculate dimensions based on selection state
  const width = isSelected ? BASE_MARKER_SIZE * 1.2 : BASE_MARKER_SIZE;
  const height = width;
  const iconSize: [number, number] = [width, height];
  const iconAnchor: [number, number] = [width / 2, height];
  const popupAnchor: [number, number] = [0, -height];

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
): L.DivIcon {
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
 * @returns Promise resolving to Leaflet L.Icon or L.DivIcon instance
 */
export async function getMarkerIconAsync(
  type: 'mill' | 'poca' = 'mill',
  isSelected?: boolean,
  isGreyedOut?: boolean,
  waterLineColor?: string | null
): Promise<L.Icon | L.DivIcon> {
  // Calculate dimensions based on selection state
  const width = isSelected ? BASE_MARKER_SIZE * 1.2 : BASE_MARKER_SIZE;
  const height = width;
  const iconSize: [number, number] = [width, height];
  const iconAnchor: [number, number] = [width / 2, height];
  const popupAnchor: [number, number] = [0, -height];

  // Add className for CSS styling when greyed out
  const className = isGreyedOut ? 'mill-marker-greyed-out' : '';

  // Phase 5.9.8: Tint marker-lines with water line color if provided
  // If no color is provided, use blue (#3b82f6) as the default for both mills and pocas
  const fillColor = waterLineColor || (type === 'mill' || type === 'poca' ? '#3b82f6' : null);

  // Fetch and tint the SVG (always tint, since we have a default color for both mill and poca)
  let tintedSvgUrl: string | null = null;
  if (fillColor) {
    tintedSvgUrl = await fetchAndTintSVG(type, fillColor);
  } else {
    // Fallback: fetch the original template without tinting (shouldn't happen for mill/poca)
    const svgText = await fetchSVGTemplate(type);
    if (svgText) {
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      tintedSvgUrl = URL.createObjectURL(blob);
    }
  }

  if (tintedSvgUrl) {
    console.log('[getMarkerIconAsync] Successfully created icon for', type,
      fillColor ? `with marker-lines color: ${fillColor}` : 'with original colors (no water line)');
    return L.icon({
      iconUrl: tintedSvgUrl,
      iconRetinaUrl: tintedSvgUrl,
      iconSize,
      iconAnchor,
      popupAnchor,
      className,
    });
  }

  // Fallback to transparent div icon if loading fails (no blue pin)
  console.warn('[getMarkerIconAsync] Failed to load SVG, using transparent fallback for', type);
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
): Promise<L.Icon | L.DivIcon> {
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
export function getPocaIcon(customIconUrl?: string | null): L.DivIcon {
  return getMarkerIcon('poca');
}
