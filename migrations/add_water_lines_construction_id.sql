-- Migration: Add constructionId to water_lines table
-- This migration adds a foreign key relationship between water_lines and constructions
-- 
-- IMPORTANT: After running this migration, you MUST run the cleanup script:
--   npx tsx scripts/reparent-water-lines.ts
-- 
-- This will create parent construction records for all existing water_lines.
-- After the cleanup script completes, run the follow-up migration to make constructionId NOT NULL.

-- Step 1: Add constructionId column (nullable initially to allow existing rows)
ALTER TABLE water_lines
ADD COLUMN construction_id UUID;

-- Step 2: Add foreign key constraint (deferrable initially to allow data migration)
ALTER TABLE water_lines
ADD CONSTRAINT water_lines_construction_id_fkey
FOREIGN KEY (construction_id)
REFERENCES constructions(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Add unique constraint (deferrable initially)
ALTER TABLE water_lines
ADD CONSTRAINT water_lines_construction_id_unique
UNIQUE (construction_id)
DEFERRABLE INITIALLY DEFERRED;

-- Step 4: Create index for better join performance
CREATE INDEX IF NOT EXISTS water_lines_construction_id_idx ON water_lines(construction_id);

-- NOTE: After running the cleanup script (scripts/reparent-water-lines.ts),
-- run the follow-up migration: make_water_lines_construction_id_not_null.sql
