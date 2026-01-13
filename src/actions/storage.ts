'use server';

import { createClient } from '@/lib/supabase';

/**
 * Storage Server Actions
 * 
 * Handles image uploads to Supabase Storage 'stonework' bucket.
 * Files are organized by folder: mills/{slug}/...
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/**
 * Validates an image file
 * 
 * @param file - File object to validate
 * @returns Error message if invalid, null if valid
 */
function validateImageFile(file: File): string | null {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Invalid file type. Only JPEG and PNG images are allowed.';
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
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  
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
 * Uploads a stonework image to Supabase Storage
 * 
 * @param formData - FormData containing the file and metadata
 * @param formData.file - The image file to upload
 * @param formData.slug - Construction slug for folder organization
 * @param formData.prefix - Optional prefix for filename (e.g., 'main' for main image)
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
    const validationError = validateImageFile(file);
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
      .from('stonework')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('[uploadStoneworkImage]: Upload error:', uploadError);
      return { 
        success: false, 
        error: `Failed to upload image: ${uploadError.message}` 
      };
    }

    // Return relative path (not full URL) - the frontend will use getPublicUrl() to construct URLs
    return { success: true, data: { path: filePath } };
  } catch (error) {
    console.error('[uploadStoneworkImage]:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred while uploading the image' 
    };
  }
}
