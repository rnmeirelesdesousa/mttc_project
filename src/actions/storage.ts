'use server';

import { createClient } from '@/lib/supabase';

/**
 * Storage Server Actions
 * 
 * Handles image uploads to Supabase Storage 'constructions' bucket.
 * Files are organized by folder: mills/{slug}/...
 */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const ALLOWED_SVG_TYPES = ['image/svg+xml', 'image/svg'];
const MAX_SVG_SIZE = 1 * 1024 * 1024; // 1MB for SVG files

/**
 * Validates a file (image or PDF)
 * 
 * @param file - File object to validate
 * @returns Error message if invalid, null if valid
 */
function validateFile(file: File): string | null {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Invalid file type. Only JPEG, PNG images and PDF documents are allowed.';
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
  }

  return null;
}

/**
 * Generates a unique filename with timestamp
 * 
 * @param originalName - Original filename
 * @param slug - Construction slug for folder organization
 * @param prefix - Optional prefix (e.g., 'main' for main image)
 * @returns Relative path string (e.g., "mills/azenha-do-rio/main-1234567890.jpg")
 */
function generateFilePath(
  originalName: string,
  slug: string,
  prefix?: string
): string {
  // Extract extension from original filename
  const extension = originalName.split('.').pop()?.toLowerCase() || 'bin';

  // Generate timestamp
  const timestamp = Date.now();

  // Sanitize slug (remove any invalid characters)
  const sanitizedSlug = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  // Build filename
  const filename = prefix
    ? `${prefix}-${timestamp}.${extension}`
    : `${timestamp}.${extension}`;

  // Return relative path: mills/{slug}/{filename}
  return `mills/${sanitizedSlug}/${filename}`;
}

/**
 * Uploads a construction image or document to Supabase Storage
 * 
 * @param formData - FormData containing the file and metadata
 * @param formData.file - The file to upload (image or PDF)
 * @param formData.slug - Construction slug for folder organization
 * @param formData.prefix - Optional prefix for filename
 * @returns Standardized response: { success: true, data?: { path: string } } or { success: false, error: string }
 */
export async function uploadStoneworkImage(
  formData: FormData
): Promise<
  | { success: true; data: { path: string } }
  | { success: false; error: string }
> {
  try {
    // Extract file from FormData
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Extract metadata
    const slug = formData.get('slug') as string | null;
    if (!slug || typeof slug !== 'string') {
      return { success: false, error: 'Slug is required for file organization' };
    }

    const prefix = formData.get('prefix') as string | null;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Generate file path
    const filePath = generateFilePath(file.name, slug, prefix || undefined);

    // Get Supabase client
    const supabase = await createClient();

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('constructions')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('[uploadStoneworkImage]: Upload error:', uploadError);
      return {
        success: false,
        error: `Failed to upload file: ${uploadError.message}`
      };
    }

    // Return relative path (not full URL) - the frontend will use getPublicUrl() to construct URLs
    return { success: true, data: { path: filePath } };
  } catch (error) {
    console.error('[uploadStoneworkImage]:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while uploading the file'
    };
  }
}

/**
 * Validates an SVG file
 * 
 * @param file - File object to validate
 * @returns Error message if invalid, null if valid
 */
function validateSVGFile(file: File): string | null {
  // Check file type
  if (!ALLOWED_SVG_TYPES.includes(file.type)) {
    return 'Invalid file type. Only SVG files are allowed.';
  }

  // Check file size
  if (file.size > MAX_SVG_SIZE) {
    return `File size exceeds maximum allowed size of ${MAX_SVG_SIZE / 1024 / 1024}MB.`;
  }

  return null;
}

/**
 * Generates a file path for map assets
 * 
 * @param originalName - Original filename
 * @param slug - Construction slug for folder organization
 * @returns Relative path string (e.g., "markers/azenha-do-rio/icon-1234567890.svg")
 */
function generateMapAssetFilePath(
  originalName: string,
  slug: string
): string {
  // Extract extension from original filename
  const extension = originalName.split('.').pop()?.toLowerCase() || 'svg';

  // Generate timestamp
  const timestamp = Date.now();

  // Sanitize slug (remove any invalid characters)
  const sanitizedSlug = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  // Build filename
  const filename = `icon-${timestamp}.${extension}`;

  // Return relative path: markers/{slug}/{filename}
  return `markers/${sanitizedSlug}/${filename}`;
}

/**
 * Uploads a map asset (SVG marker) to Supabase Storage 'map-assets' bucket
 * 
 * Phase 5.9.8: Used for uploading custom SVG markers for constructions.
 * These markers will be tinted with the associated Levada's color on the map.
 * 
 * @param formData - FormData containing the file and metadata
 * @param formData.file - The SVG file to upload
 * @param formData.slug - Construction slug for folder organization
 * @returns Standardized response: { success: true, data?: { url: string } } or { success: false, error: string }
 */
export async function uploadMapAsset(
  formData: FormData
): Promise<
  | { success: true; data: { url: string } }
  | { success: false; error: string }
> {
  try {
    // Extract file from FormData
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Extract metadata
    const slug = formData.get('slug') as string | null;
    if (!slug || typeof slug !== 'string') {
      return { success: false, error: 'Slug is required for file organization' };
    }

    // Validate file
    const validationError = validateSVGFile(file);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Generate file path
    const filePath = generateMapAssetFilePath(file.name, slug);

    // Get Supabase client
    const supabase = await createClient();

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage 'map-assets' bucket
    const { error: uploadError } = await supabase.storage
      .from('map-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('[uploadMapAsset]: Upload error:', uploadError);
      return {
        success: false,
        error: `Failed to upload map asset: ${uploadError.message}`
      };
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('map-assets')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        error: 'Failed to generate public URL for uploaded file'
      };
    }

    // Return full public URL
    return { success: true, data: { url: urlData.publicUrl } };
  } catch (error) {
    console.error('[uploadMapAsset]:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while uploading the map asset'
    };
  }
}
