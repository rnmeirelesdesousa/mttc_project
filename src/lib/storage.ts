/**
 * Storage Utility
 * 
 * Provides helper functions for generating Supabase Storage CDN URLs.
 * Images are stored in the 'constructions' bucket in Supabase Storage.
 * Only relative paths (strings) are stored in Postgres; binary data stays in Supabase.
 */

/**
 * Gets the public CDN URL for an image stored in Supabase Storage
 * 
 * @param path - Relative path to the image in the 'constructions' bucket (e.g., "mills/azenha-do-rio/1234567890.jpg")
 * @returns Full public CDN URL or null if path is null/empty
 * 
 * @example
 * getPublicUrl("mills/azenha-do-rio/1234567890.jpg")
 * // Returns: "https://[project-id].supabase.co/storage/v1/object/public/constructions/mills/azenha-do-rio/1234567890.jpg"
 */
export type StorageImageTransform = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

export function getPublicUrl(path: string | null | undefined, options?: StorageImageTransform): string | null {
  // Handle null/empty paths gracefully
  if (!path || path.trim() === '') {
    return null;
  }

  // Get Supabase URL from environment variable
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('[getPublicUrl]: NEXT_PUBLIC_SUPABASE_URL is not defined. Returning null.');
    return null;
  }

  // Remove trailing slash from URL if present
  const baseUrl = supabaseUrl.replace(/\/$/, '');

  // Construct the public storage URL
  // Pattern: https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[path]
  let publicUrl = `${baseUrl}/storage/v1/object/public/constructions/${path}`;

  // Apply transformation options if provided
  if (options) {
    const params = new URLSearchParams();
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.resize) params.append('resize', options.resize);

    const queryString = params.toString();
    if (queryString) {
      publicUrl += `?${queryString}`;
    }
  }

  return publicUrl;
}

