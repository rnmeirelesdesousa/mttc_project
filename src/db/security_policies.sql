-- ============================================================================
-- Phase 3: Academic Shield - Row Level Security (RLS) Policies & Triggers
-- ============================================================================
-- 
-- This file contains RLS policies and triggers that enforce the "Academic Shield"
-- security model:
--   - Public: Can read published constructions only
--   - Researcher: Can read all, write/create (but status forced to 'draft')
--   - Admin: Can read all, write/create, and publish (status = 'published')
--
-- IMPORTANT: Run this SQL against your local Supabase/Docker instance after
-- running the Drizzle migration that creates the profiles table.
-- ============================================================================

-- ============================================================================
-- PART A: Enable RLS on Core Tables
-- ============================================================================

ALTER TABLE constructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mills_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART B: PROFILES POLICIES
-- ============================================================================

-- Public can read basic profile info (names/affiliations) of authors
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- PART C: CONSTRUCTIONS POLICIES
-- ============================================================================

-- READ: Public sees PUBLISHED; Researchers/Admins see ALL
CREATE POLICY "Read Access" ON constructions
FOR SELECT USING (
  status = 'published' OR 
  (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin')))
);

-- WRITE: Researchers and Admins only
CREATE POLICY "Write Access" ON constructions
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
);

CREATE POLICY "Update Access" ON constructions
FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
);

-- ============================================================================
-- PART D: MILLS_DATA POLICIES
-- ============================================================================
-- Access to mills_data follows the parent construction's access rules

CREATE POLICY "Read Access" ON mills_data
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM constructions c
    WHERE c.id = mills_data.construction_id
    AND (
      c.status = 'published' OR 
      (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin')))
    )
  )
);

CREATE POLICY "Write Access" ON mills_data
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
  AND EXISTS (
    SELECT 1 FROM constructions c
    WHERE c.id = mills_data.construction_id
    AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
  )
);

CREATE POLICY "Update Access" ON mills_data
FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
  AND EXISTS (
    SELECT 1 FROM constructions c
    WHERE c.id = mills_data.construction_id
    AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
  )
);

-- ============================================================================
-- PART E: CONSTRUCTION_TRANSLATIONS POLICIES
-- ============================================================================
-- Access to translations follows the parent construction's access rules

CREATE POLICY "Read Access" ON construction_translations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM constructions c
    WHERE c.id = construction_translations.construction_id
    AND (
      c.status = 'published' OR 
      (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin')))
    )
  )
);

CREATE POLICY "Write Access" ON construction_translations
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
  AND EXISTS (
    SELECT 1 FROM constructions c
    WHERE c.id = construction_translations.construction_id
    AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
  )
);

CREATE POLICY "Update Access" ON construction_translations
FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
  AND EXISTS (
    SELECT 1 FROM constructions c
    WHERE c.id = construction_translations.construction_id
    AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('researcher', 'admin'))
  )
);

-- ============================================================================
-- PART F: The "Force Draft" Trigger (Critical)
-- ============================================================================
-- This trigger ensures that Researchers can ONLY create/update constructions
-- with status = 'draft'. Only Admins can set status to 'published' or 'review'.

-- 1. Create the Function
CREATE OR REPLACE FUNCTION enforce_researcher_draft_status()
RETURNS TRIGGER AS $$
DECLARE
  user_role public.user_role;
BEGIN
  -- Get the role of the user making the change
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- IF user is NOT admin (i.e., is Researcher), FORCE status to 'draft'
  IF user_role != 'admin' THEN
    NEW.status := 'draft';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the Trigger to INSERT and UPDATE
CREATE TRIGGER tr_enforce_draft_status
BEFORE INSERT OR UPDATE ON constructions
FOR EACH ROW
EXECUTE FUNCTION enforce_researcher_draft_status();

