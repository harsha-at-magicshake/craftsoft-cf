-- ================================================================================
-- 04. TUTORS - Trainer Profiles
-- Description: Manages trainer profiles and their assigned courses.
-- ================================================================================

CREATE TABLE IF NOT EXISTS tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    linkedin_url TEXT,
    courses TEXT[],
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins can read tutors" ON tutors;
DROP POLICY IF EXISTS "Active admins can insert tutors" ON tutors;
DROP POLICY IF EXISTS "Active admins can update tutors" ON tutors;
DROP POLICY IF EXISTS "Active admins can delete tutors" ON tutors;

CREATE POLICY "Active admins can read tutors" ON tutors
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can insert tutors" ON tutors
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can update tutors" ON tutors
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can delete tutors" ON tutors
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE INDEX IF NOT EXISTS idx_tutors_status ON tutors(status);

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tutors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS tutors_updated_at ON tutors;
CREATE TRIGGER tutors_updated_at
    BEFORE UPDATE ON tutors
    FOR EACH ROW EXECUTE FUNCTION update_tutors_updated_at();
