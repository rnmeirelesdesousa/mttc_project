-- ============================================================================
-- Migration: Add status column to water_lines table
-- ============================================================================
-- This migration adds the status column to the water_lines table to support
-- draft, review, and published statuses for Levadas (Water Lines).
--
-- Status values:
-- - 'draft': Default status for newly created water lines
-- - 'review': Water lines submitted for admin review
-- - 'published': Water lines approved and visible to public
--
-- Usage: Run this script in Supabase SQL Editor or via psql
-- ============================================================================

-- Check if column exists before adding (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'water_lines' 
        AND column_name = 'status'
    ) THEN
        -- Add status column with default value 'draft'
        ALTER TABLE "water_lines" 
        ADD COLUMN "status" status DEFAULT 'draft' NOT NULL;
        
        -- Update existing water lines to 'published' (assuming they were already public)
        -- Change this to 'draft' or 'review' if you want to review existing entries
        UPDATE "water_lines" SET "status" = 'published' WHERE "status" IS NULL;
    END IF;
END $$;
