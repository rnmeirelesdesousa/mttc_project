-- ============================================================================
-- Scientific Catch-up Migration for mills_data Table
-- ============================================================================
-- This migration adds all scientific columns that were added during the
-- "Scientific Leap" phase to the mills_data table.
-- 
-- Safety: All column additions use IF NOT EXISTS checks (idempotent).
-- 
-- Run this in the Supabase SQL Editor to sync the database with the code schema.

-- ============================================================================
-- STEP 1: Create Enum Types (if they don't exist)
-- ============================================================================

-- Setting Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'setting') THEN
        CREATE TYPE "setting" AS ENUM('rural', 'urban', 'isolated', 'milling_cluster');
    END IF;
END $$;

-- Volumetry Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'volumetry') THEN
        CREATE TYPE "volumetry" AS ENUM('cylindrical', 'conical', 'prismatic_sq_rec');
    END IF;
END $$;

-- Exterior Finish Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exterior_finish') THEN
        CREATE TYPE "exterior_finish" AS ENUM('exposed', 'plastered', 'whitewashed');
    END IF;
END $$;

-- Roof Material Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roof_material') THEN
        CREATE TYPE "roof_material" AS ENUM('tile', 'zinc', 'thatch', 'slate');
    END IF;
END $$;

-- Captation Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'captation_type') THEN
        CREATE TYPE "captation_type" AS ENUM('weir', 'pool', 'direct');
    END IF;
END $$;

-- Conduction Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conduction_type') THEN
        CREATE TYPE "conduction_type" AS ENUM('levada', 'modern_pipe');
    END IF;
END $$;

-- Conduction State Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conduction_state') THEN
        CREATE TYPE "conduction_state" AS ENUM('operational_clean', 'clogged', 'damaged_broken');
    END IF;
END $$;

-- Admission Rodizio Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admission_rodizio') THEN
        CREATE TYPE "admission_rodizio" AS ENUM('cubo', 'calha');
    END IF;
END $$;

-- Admission Azenha Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admission_azenha') THEN
        CREATE TYPE "admission_azenha" AS ENUM('calha_superior', 'canal_inferior');
    END IF;
END $$;

-- Wheel Type Rodizio Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wheel_type_rodizio') THEN
        CREATE TYPE "wheel_type_rodizio" AS ENUM('penas', 'colheres');
    END IF;
END $$;

-- Wheel Type Azenha Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wheel_type_azenha') THEN
        CREATE TYPE "wheel_type_azenha" AS ENUM('copeira', 'dezio_palas');
    END IF;
END $$;

-- Motive Apparatus Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'motive_apparatus') THEN
        CREATE TYPE "motive_apparatus" AS ENUM('sails', 'shells', 'tail', 'cap');
    END IF;
END $$;

-- Millstone State Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'millstone_state') THEN
        CREATE TYPE "millstone_state" AS ENUM('complete', 'disassembled', 'fragmented', 'missing');
    END IF;
END $$;

-- Epigraphy Location Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epigraphy_location') THEN
        CREATE TYPE "epigraphy_location" AS ENUM('door_jambs', 'interior_walls', 'millstones', 'other');
    END IF;
END $$;

-- Epigraphy Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epigraphy_type') THEN
        CREATE TYPE "epigraphy_type" AS ENUM('dates', 'initials', 'religious_symbols', 'counting_marks');
    END IF;
END $$;

-- Conservation State Enum (for rating columns)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conservation_state') THEN
        CREATE TYPE "conservation_state" AS ENUM('very_good', 'good', 'reasonable', 'bad', 'very_bad_ruin');
    END IF;
END $$;

-- Plan Shape Enum (if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_shape') THEN
        CREATE TYPE "plan_shape" AS ENUM('circular_tower', 'quadrangular', 'rectangular', 'irregular');
    END IF;
END $$;

-- Construction Technique Enum (if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'construction_technique') THEN
        CREATE TYPE "construction_technique" AS ENUM('dry_stone', 'mortared_stone', 'mixed_other');
    END IF;
END $$;

-- Roof Shape Enum (if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roof_shape') THEN
        CREATE TYPE "roof_shape" AS ENUM('conical', 'gable', 'lean_to', 'inexistent');
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add Missing Columns to mills_data Table
-- ============================================================================

-- Characterization
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'setting'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "setting" "setting";
    END IF;
END $$;

-- Architecture (Section III)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'volumetry'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "volumetry" "volumetry";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'exterior_finish'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "exterior_finish" "exterior_finish";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'roof_material'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "roof_material" "roof_material";
    END IF;
END $$;

-- Motive Systems - Hydraulic (Section IV)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'captation_type'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "captation_type" "captation_type";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'conduction_type'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "conduction_type" "conduction_type";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'conduction_state'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "conduction_state" "conduction_state";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'admission_rodizio'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "admission_rodizio" "admission_rodizio";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'admission_azenha'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "admission_azenha" "admission_azenha";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'wheel_type_rodizio'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "wheel_type_rodizio" "wheel_type_rodizio";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'wheel_type_azenha'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "wheel_type_azenha" "wheel_type_azenha";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'rodizio_qty'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "rodizio_qty" integer;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'azenha_qty'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "azenha_qty" integer;
    END IF;
END $$;

-- Motive Systems - Wind
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'motive_apparatus'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "motive_apparatus" "motive_apparatus";
    END IF;
END $$;

-- Grinding Mechanism
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'millstone_quantity'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "millstone_quantity" integer;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'millstone_diameter'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "millstone_diameter" text;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'millstone_state'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "millstone_state" "millstone_state";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_tremonha'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_tremonha" boolean DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_quelha'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_quelha" boolean DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_urreiro'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_urreiro" boolean DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_aliviadouro'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_aliviadouro" boolean DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_farinaleiro'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_farinaleiro" boolean DEFAULT false;
    END IF;
END $$;

-- Epigraphy (Section V)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'epigraphy_presence'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "epigraphy_presence" boolean DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'epigraphy_location'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "epigraphy_location" "epigraphy_location";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'epigraphy_type'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "epigraphy_type" "epigraphy_type";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'epigraphy_description'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "epigraphy_description" text;
    END IF;
END $$;

-- Conservation Ratings (Section VI - Granular)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'rating_structure'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "rating_structure" "conservation_state";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'rating_roof'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "rating_roof" "conservation_state";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'rating_hydraulic'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "rating_hydraulic" "conservation_state";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'rating_mechanism'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "rating_mechanism" "conservation_state";
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'rating_overall'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "rating_overall" "conservation_state";
    END IF;
END $$;

-- Annexes (Boolean flags)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_oven'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_oven" boolean DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_miller_house'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_miller_house" boolean DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_stable'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_stable" boolean DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mills_data' 
        AND column_name = 'has_fulling_mill'
    ) THEN
        ALTER TABLE "mills_data" ADD COLUMN "has_fulling_mill" boolean DEFAULT false;
    END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- All scientific columns have been added to the mills_data table.
-- The table should now match the code schema in src/db/schema.ts.
-- 
-- Verify by checking the table structure:
-- SELECT column_name, data_type, udt_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'mills_data' 
-- ORDER BY ordinal_position;
