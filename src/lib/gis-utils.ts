/**
 * GIS Utility Functions
 * 
 * Provides functions for geographic calculations including:
 * - Distance calculations (Haversine formula)
 * - Point-to-line-segment distance
 * - Nearest feature finding with snapping
 */

import type { PublishedMill, MapWaterLine } from '@/actions/public';

/**
 * Calculate the distance between two points in meters using the Haversine formula
 * 
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance from a point to a line segment and return the closest point on the segment
 * 
 * @param pointLat - Latitude of the point
 * @param pointLng - Longitude of the point
 * @param segStartLat - Latitude of segment start
 * @param segStartLng - Longitude of segment start
 * @param segEndLat - Latitude of segment end
 * @param segEndLng - Longitude of segment end
 * @returns Object with distance in meters and the closest point on the segment [lat, lng]
 */
export function distanceToLineSegment(
  pointLat: number,
  pointLng: number,
  segStartLat: number,
  segStartLng: number,
  segEndLat: number,
  segEndLng: number
): { distance: number; closestPoint: [number, number] } {
  // Convert to radians for calculations
  const pLat = toRadians(pointLat);
  const pLng = toRadians(pointLng);
  const sLat = toRadians(segStartLat);
  const sLng = toRadians(segStartLng);
  const eLat = toRadians(segEndLat);
  const eLng = toRadians(segEndLng);

  // Calculate vectors
  const dx = eLng - sLng;
  const dy = eLat - sLat;
  const d2 = dx * dx + dy * dy;

  // If segment is a point, return distance to that point
  if (d2 < 1e-10) {
    const dist = calculateDistance(pointLat, pointLng, segStartLat, segStartLng);
    return { distance: dist, closestPoint: [segStartLat, segStartLng] };
  }

  // Calculate parameter t (0 to 1) for closest point on segment
  const t = Math.max(0, Math.min(1, ((pLng - sLng) * dx + (pLat - sLat) * dy) / d2));

  // Calculate closest point on segment
  const closestLng = sLng + t * dx;
  const closestLat = sLat + t * dy;

  // Convert back to degrees
  const closestLatDeg = closestLat * (180 / Math.PI);
  const closestLngDeg = closestLng * (180 / Math.PI);

  // Calculate distance to closest point
  const distance = calculateDistance(pointLat, pointLng, closestLatDeg, closestLngDeg);

  return { distance, closestPoint: [closestLatDeg, closestLngDeg] };
}

/**
 * Result of finding the nearest feature
 */
export interface NearestFeatureResult {
  type: 'mill' | 'levada' | null;
  distance: number; // in meters
  snappedPoint: [number, number]; // [lat, lng]
  feature?: PublishedMill | MapWaterLine;
}

/**
 * Find the nearest feature (mill or levada) to a given point
 * 
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @param mills - Array of mills to check
 * @param waterLines - Array of water lines to check
 * @param thresholdMeters - Maximum distance in meters to consider (default: 10)
 * @returns Nearest feature result or null if nothing within threshold
 */
export function findNearestFeature(
  lat: number,
  lng: number,
  mills: PublishedMill[],
  waterLines: MapWaterLine[],
  thresholdMeters: number = 10
): NearestFeatureResult | null {
  let nearest: NearestFeatureResult | null = null;

  // Check mills (points)
  for (const mill of mills) {
    if (mill.lat === null || mill.lng === null || isNaN(mill.lat) || isNaN(mill.lng)) {
      continue;
    }

    const distance = calculateDistance(lat, lng, mill.lat, mill.lng);
    
    if (distance <= thresholdMeters && (nearest === null || distance < nearest.distance)) {
      nearest = {
        type: 'mill',
        distance,
        snappedPoint: [mill.lat, mill.lng],
        feature: mill,
      };
    }
  }

  // Check water lines (line segments)
  for (const waterLine of waterLines) {
    if (!waterLine.path || waterLine.path.length < 2) {
      continue;
    }

    // Check each segment of the polyline
    for (let i = 0; i < waterLine.path.length - 1; i++) {
      const [segStartLat, segStartLng] = waterLine.path[i]!;
      const [segEndLat, segEndLng] = waterLine.path[i + 1]!;

      const { distance, closestPoint } = distanceToLineSegment(
        lat,
        lng,
        segStartLat,
        segStartLng,
        segEndLat,
        segEndLng
      );

      if (distance <= thresholdMeters && (nearest === null || distance < nearest.distance)) {
        nearest = {
          type: 'levada',
          distance,
          snappedPoint: closestPoint,
          feature: waterLine,
        };
      }
    }
  }

  return nearest;
}

/**
 * Find the nearest mill to a given point (for levada editor)
 * 
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @param mills - Array of mills to check
 * @param thresholdMeters - Maximum distance in meters to consider (default: 10)
 * @returns Nearest mill result or null if nothing within threshold
 */
export function findNearestMill(
  lat: number,
  lng: number,
  mills: PublishedMill[],
  thresholdMeters: number = 10
): { mill: PublishedMill; distance: number; snappedPoint: [number, number] } | null {
  let nearest: { mill: PublishedMill; distance: number; snappedPoint: [number, number] } | null = null;

  for (const mill of mills) {
    if (mill.lat === null || mill.lng === null || isNaN(mill.lat) || isNaN(mill.lng)) {
      continue;
    }

    const distance = calculateDistance(lat, lng, mill.lat, mill.lng);
    
    if (distance <= thresholdMeters && (nearest === null || distance < nearest.distance)) {
      nearest = {
        mill,
        distance,
        snappedPoint: [mill.lat, mill.lng],
      };
    }
  }

  return nearest;
}

/**
 * Find the nearest point on a water line to a given point (for mill placement)
 * 
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @param waterLines - Array of water lines to check
 * @param thresholdMeters - Maximum distance in meters to consider (default: 10)
 * @returns Nearest water line result or null if nothing within threshold
 */
export function findNearestWaterLine(
  lat: number,
  lng: number,
  waterLines: MapWaterLine[],
  thresholdMeters: number = 10
): { waterLine: MapWaterLine; distance: number; snappedPoint: [number, number] } | null {
  let nearest: { waterLine: MapWaterLine; distance: number; snappedPoint: [number, number] } | null = null;

  for (const waterLine of waterLines) {
    if (!waterLine.path || waterLine.path.length < 2) {
      continue;
    }

    // Check each segment of the polyline
    for (let i = 0; i < waterLine.path.length - 1; i++) {
      const [segStartLat, segStartLng] = waterLine.path[i]!;
      const [segEndLat, segEndLng] = waterLine.path[i + 1]!;

      const { distance, closestPoint } = distanceToLineSegment(
        lat,
        lng,
        segStartLat,
        segStartLng,
        segEndLat,
        segEndLng
      );

      if (distance <= thresholdMeters && (nearest === null || distance < nearest.distance)) {
        nearest = {
          waterLine,
          distance,
          snappedPoint: closestPoint,
        };
      }
    }
  }

  return nearest;
}
