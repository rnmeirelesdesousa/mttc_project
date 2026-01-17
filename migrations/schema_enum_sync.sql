-- ============================================================================
-- SCHEMA ENUM SYNC MIGRATION
-- Purpose: Sync all enum values between Drizzle schema and Supabase database
-- Generated: Phase 5.99 - Complete Schema Reconciliation
-- ============================================================================
-- 
-- This migration adds missing enum values to existing Postgres enums.
-- All columns already exist in mills_data table - we're only updating enum definitions.
--
-- Usage: Run this script in Supabase SQL Editor or via psql
-- ============================================================================

-- ============================================================================
-- 1. Update plan_shape enum
-- ============================================================================
-- Add missing values: circular, rectangular, square, polygonal
-- (circular_tower, quadrangular, irregular already exist)

DO $$ 
BEGIN
    -- Add 'circular' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'circular' AND enumtypid = 'plan_shape'::regtype) THEN
        ALTER TYPE plan_shape ADD VALUE IF NOT EXISTS 'circular';
    END IF;
    
    -- Add 'rectangular' if not exists (may already exist)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rectangular' AND enumtypid = 'plan_shape'::regtype) THEN
        ALTER TYPE plan_shape ADD VALUE IF NOT EXISTS 'rectangular';
    END IF;
    
    -- Add 'square' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'square' AND enumtypid = 'plan_shape'::regtype) THEN
        ALTER TYPE plan_shape ADD VALUE IF NOT EXISTS 'square';
    END IF;
    
    -- Add 'polygonal' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'polygonal' AND enumtypid = 'plan_shape'::regtype) THEN
        ALTER TYPE plan_shape ADD VALUE IF NOT EXISTS 'polygonal';
    END IF;
END $$;

-- ============================================================================
-- 2. Update setting enum
-- ============================================================================
-- Replace 'milling_cluster' with 'riverbank' (or add riverbank if needed)
-- Note: If 'milling_cluster' is in use, we'll keep it but add 'riverbank'

DO $$ 
BEGIN
    -- Add 'riverbank' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'riverbank' AND enumtypid = 'setting'::regtype) THEN
        ALTER TYPE setting ADD VALUE IF NOT EXISTS 'riverbank';
    END IF;
END $$;

-- ============================================================================
-- 3. Verify volumetry enum (should already have all values)
-- ============================================================================
-- Values: cylindrical, conical, prismatic_sq_rec
-- These should already exist, but verify and add if missing

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cylindrical' AND enumtypid = 'volumetry'::regtype) THEN
        ALTER TYPE volumetry ADD VALUE IF NOT EXISTS 'cylindrical';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'conical' AND enumtypid = 'volumetry'::regtype) THEN
        ALTER TYPE volumetry ADD VALUE IF NOT EXISTS 'conical';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'prismatic_sq_rec' AND enumtypid = 'volumetry'::regtype) THEN
        ALTER TYPE volumetry ADD VALUE IF NOT EXISTS 'prismatic_sq_rec';
    END IF;
END $$;

-- ============================================================================
-- 4. Verify exterior_finish enum (should already have all values)
-- ============================================================================
-- Values: exposed, plastered, whitewashed

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'exposed' AND enumtypid = 'exterior_finish'::regtype) THEN
        ALTER TYPE exterior_finish ADD VALUE IF NOT EXISTS 'exposed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'plastered' AND enumtypid = 'exterior_finish'::regtype) THEN
        ALTER TYPE exterior_finish ADD VALUE IF NOT EXISTS 'plastered';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'whitewashed' AND enumtypid = 'exterior_finish'::regtype) THEN
        ALTER TYPE exterior_finish ADD VALUE IF NOT EXISTS 'whitewashed';
    END IF;
END $$;

-- ============================================================================
-- 5. Verify roof_material enum (should already have all values)
-- ============================================================================
-- Values: tile, zinc, thatch, slate

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tile' AND enumtypid = 'roof_material'::regtype) THEN
        ALTER TYPE roof_material ADD VALUE IF NOT EXISTS 'tile';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'zinc' AND enumtypid = 'roof_material'::regtype) THEN
        ALTER TYPE roof_material ADD VALUE IF NOT EXISTS 'zinc';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'thatch' AND enumtypid = 'roof_material'::regtype) THEN
        ALTER TYPE roof_material ADD VALUE IF NOT EXISTS 'thatch';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'slate' AND enumtypid = 'roof_material'::regtype) THEN
        ALTER TYPE roof_material ADD VALUE IF NOT EXISTS 'slate';
    END IF;
END $$;

-- ============================================================================
-- 6. Verify motive_apparatus enum (should already have all values)
-- ============================================================================
-- Values: sails, shells, tail, cap

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sails' AND enumtypid = 'motive_apparatus'::regtype) THEN
        ALTER TYPE motive_apparatus ADD VALUE IF NOT EXISTS 'sails';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'shells' AND enumtypid = 'motive_apparatus'::regtype) THEN
        ALTER TYPE motive_apparatus ADD VALUE IF NOT EXISTS 'shells';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tail' AND enumtypid = 'motive_apparatus'::regtype) THEN
        ALTER TYPE motive_apparatus ADD VALUE IF NOT EXISTS 'tail';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cap' AND enumtypid = 'motive_apparatus'::regtype) THEN
        ALTER TYPE motive_apparatus ADD VALUE IF NOT EXISTS 'cap';
    END IF;
END $$;

-- ============================================================================
-- 7. Verify millstone_state enum (should already have all values)
-- ============================================================================
-- Values: complete, disassembled, fragmented, missing

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'complete' AND enumtypid = 'millstone_state'::regtype) THEN
        ALTER TYPE millstone_state ADD VALUE IF NOT EXISTS 'complete';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'disassembled' AND enumtypid = 'millstone_state'::regtype) THEN
        ALTER TYPE millstone_state ADD VALUE IF NOT EXISTS 'disassembled';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fragmented' AND enumtypid = 'millstone_state'::regtype) THEN
        ALTER TYPE millstone_state ADD VALUE IF NOT EXISTS 'fragmented';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'missing' AND enumtypid = 'millstone_state'::regtype) THEN
        ALTER TYPE millstone_state ADD VALUE IF NOT EXISTS 'missing';
    END IF;
END $$;

-- ============================================================================
-- 8. Verify conservation_state enum (5-point scale)
-- ============================================================================
-- Values: very_good, good, reasonable, bad, very_bad_ruin

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'very_good' AND enumtypid = 'conservation_state'::regtype) THEN
        ALTER TYPE conservation_state ADD VALUE IF NOT EXISTS 'very_good';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'good' AND enumtypid = 'conservation_state'::regtype) THEN
        ALTER TYPE conservation_state ADD VALUE IF NOT EXISTS 'good';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'reasonable' AND enumtypid = 'conservation_state'::regtype) THEN
        ALTER TYPE conservation_state ADD VALUE IF NOT EXISTS 'reasonable';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bad' AND enumtypid = 'conservation_state'::regtype) THEN
        ALTER TYPE conservation_state ADD VALUE IF NOT EXISTS 'bad';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'very_bad_ruin' AND enumtypid = 'conservation_state'::regtype) THEN
        ALTER TYPE conservation_state ADD VALUE IF NOT EXISTS 'very_bad_ruin';
    END IF;
END $$;

-- ============================================================================
-- 9. Verify epigraphy_location enum (should already have all values)
-- ============================================================================
-- Values: door_jambs, interior_walls, millstones, other

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'door_jambs' AND enumtypid = 'epigraphy_location'::regtype) THEN
        ALTER TYPE epigraphy_location ADD VALUE IF NOT EXISTS 'door_jambs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'interior_walls' AND enumtypid = 'epigraphy_location'::regtype) THEN
        ALTER TYPE epigraphy_location ADD VALUE IF NOT EXISTS 'interior_walls';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'millstones' AND enumtypid = 'epigraphy_location'::regtype) THEN
        ALTER TYPE epigraphy_location ADD VALUE IF NOT EXISTS 'millstones';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'other' AND enumtypid = 'epigraphy_location'::regtype) THEN
        ALTER TYPE epigraphy_location ADD VALUE IF NOT EXISTS 'other';
    END IF;
END $$;

-- ============================================================================
-- 10. Verify epigraphy_type enum (should already have all values)
-- ============================================================================
-- Values: dates, initials, religious_symbols, counting_marks

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'dates' AND enumtypid = 'epigraphy_type'::regtype) THEN
        ALTER TYPE epigraphy_type ADD VALUE IF NOT EXISTS 'dates';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'initials' AND enumtypid = 'epigraphy_type'::regtype) THEN
        ALTER TYPE epigraphy_type ADD VALUE IF NOT EXISTS 'initials';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'religious_symbols' AND enumtypid = 'epigraphy_type'::regtype) THEN
        ALTER TYPE epigraphy_type ADD VALUE IF NOT EXISTS 'religious_symbols';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'counting_marks' AND enumtypid = 'epigraphy_type'::regtype) THEN
        ALTER TYPE epigraphy_type ADD VALUE IF NOT EXISTS 'counting_marks';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all enum values are present:
-- 
-- SELECT 
--     t.typname AS enum_name,
--     e.enumlabel AS enum_value
-- FROM pg_type t 
-- JOIN pg_enum e ON t.oid = e.enumtypid  
-- WHERE t.typname IN (
--     'plan_shape', 'setting', 'volumetry', 'exterior_finish', 
--     'roof_material', 'motive_apparatus', 'millstone_state', 
--     'conservation_state', 'epigraphy_location', 'epigraphy_type'
-- )
-- ORDER BY t.typname, e.enumsortorder;
-- ============================================================================
