-- ============================================================================
-- Migration: Add legacy_id to constructions table
-- ============================================================================
-- This migration adds the legacy_id column to the constructions table.
-- The column stores the original paper inventory code or external reference.

-- Check if column exists before adding (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'constructions' 
        AND column_name = 'legacy_id'
    ) THEN
        ALTER TABLE "constructions" ADD COLUMN "legacy_id" text;
    END IF;
END $$;

-- ============================================================================
-- Migration: Add observation columns to construction_translations table
-- ============================================================================
-- These columns store conservation observations (Section VI) for each locale.

-- Add observations_structure
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'construction_translations' 
        AND column_name = 'observations_structure'
    ) THEN
        ALTER TABLE "construction_translations" ADD COLUMN "observations_structure" text;
    END IF;
END $$;

-- Add observations_roof
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'construction_translations' 
        AND column_name = 'observations_roof'
    ) THEN
        ALTER TABLE "construction_translations" ADD COLUMN "observations_roof" text;
    END IF;
END $$;

-- Add observations_hydraulic
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'construction_translations' 
        AND column_name = 'observations_hydraulic'
    ) THEN
        ALTER TABLE "construction_translations" ADD COLUMN "observations_hydraulic" text;
    END IF;
END $$;

-- Add observations_mechanism
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'construction_translations' 
        AND column_name = 'observations_mechanism'
    ) THEN
        ALTER TABLE "construction_translations" ADD COLUMN "observations_mechanism" text;
    END IF;
END $$;

-- Add observations_general
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'construction_translations' 
        AND column_name = 'observations_general'
    ) THEN
        ALTER TABLE "construction_translations" ADD COLUMN "observations_general" text;
    END IF;
END $$;
