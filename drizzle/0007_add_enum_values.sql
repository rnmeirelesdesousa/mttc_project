-- Phase 5.9.20.1: Add missing enum values for scientific requirements
-- Drizzle cannot automatically push enum value additions to Postgres,
-- so this manual migration is required.

-- Add 'false_dome' to roof_shape enum
ALTER TYPE roof_shape ADD VALUE IF NOT EXISTS 'false_dome';

-- Add 'stone' to roof_material enum
ALTER TYPE roof_material ADD VALUE IF NOT EXISTS 'stone';

-- Add 'traditional_track' to access enum
ALTER TYPE access ADD VALUE IF NOT EXISTS 'traditional_track';
