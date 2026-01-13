/**
 * Slug Generation Utility
 * 
 * Converts a string (typically a title) into a URL-friendly slug.
 * Handles Portuguese characters and special cases.
 */

/**
 * Generates a URL-friendly slug from a string
 * 
 * @param text - The text to convert to a slug
 * @returns A lowercase, hyphenated slug (e.g., "Azenha do Rio" -> "azenha-do-rio")
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates a unique slug by appending a number if the base slug already exists
 * 
 * @param baseSlug - The base slug to check
 * @param checkExists - Function that checks if a slug exists
 * @returns A unique slug (e.g., "azenha-do-rio" or "azenha-do-rio-2")
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
