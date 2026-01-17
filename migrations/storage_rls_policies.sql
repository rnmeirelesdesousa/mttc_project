-- ============================================================================
-- Storage RLS Policies for 'constructions' bucket
-- ============================================================================
-- These policies control access to the Supabase Storage 'constructions' bucket.
-- 
-- Security Model:
-- - Authenticated users (researchers/admins) can INSERT and UPDATE
-- - Public (anon) users can SELECT (read) for public display
-- 
-- Run this in the Supabase SQL Editor after creating the 'constructions' bucket.

-- ============================================================================
-- Policy 1: Allow authenticated users to INSERT objects
-- ============================================================================
CREATE POLICY "Allow authenticated users to insert objects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'constructions'
);

-- ============================================================================
-- Policy 2: Allow authenticated users to UPDATE objects
-- ============================================================================
CREATE POLICY "Allow authenticated users to update objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'constructions'
)
WITH CHECK (
  bucket_id = 'constructions'
);

-- ============================================================================
-- Policy 3: Allow public (anon) users to SELECT (read) objects
-- ============================================================================
CREATE POLICY "Allow public to read objects"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'constructions'
);

-- ============================================================================
-- Note: If policies already exist, you may need to drop them first:
-- ============================================================================
-- DROP POLICY IF EXISTS "Allow authenticated users to insert objects" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to update objects" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public to read objects" ON storage.objects;
