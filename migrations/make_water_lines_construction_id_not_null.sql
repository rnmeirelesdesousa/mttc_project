-- Follow-up Migration: Make constructionId NOT NULL in water_lines table
-- 
-- IMPORTANT: Only run this AFTER running the cleanup script:
--   npx tsx scripts/reparent-water-lines.ts
-- 
-- This migration makes the constructionId column required, ensuring all water_lines
-- have a valid parent construction.

-- Step 1: Make constructionId NOT NULL
ALTER TABLE water_lines
ALTER COLUMN construction_id SET NOT NULL;

-- Step 2: Make constraints non-deferrable (now that all rows have values)
ALTER TABLE water_lines
DROP CONSTRAINT water_lines_construction_id_fkey;

ALTER TABLE water_lines
ADD CONSTRAINT water_lines_construction_id_fkey
FOREIGN KEY (construction_id)
REFERENCES constructions(id)
ON DELETE CASCADE;

ALTER TABLE water_lines
DROP CONSTRAINT water_lines_construction_id_unique;

ALTER TABLE water_lines
ADD CONSTRAINT water_lines_construction_id_unique
UNIQUE (construction_id);
