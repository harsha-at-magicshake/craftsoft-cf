-- ================================================================================
-- 03. COURSES - Training Programs
-- Description: Defines the training programs available.
-- ================================================================================

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT UNIQUE NOT NULL,
    course_code TEXT UNIQUE NOT NULL,
    course_name TEXT NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins can read courses" ON courses;
DROP POLICY IF EXISTS "Active admins can insert courses" ON courses;
DROP POLICY IF EXISTS "Active admins can update courses" ON courses;

CREATE POLICY "Active admins can read courses" ON courses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can insert courses" ON courses
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can update courses" ON courses
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

-- Public read for website (active courses only)
DROP POLICY IF EXISTS "Allow anyone to read active courses" ON courses;
CREATE POLICY "Allow anyone to read active courses" ON courses
    FOR SELECT TO public
    USING (status = 'ACTIVE');

-- Public read for verification portal (anon - all courses)
DROP POLICY IF EXISTS "Public can read courses" ON courses;
CREATE POLICY "Public can read courses" ON courses
    FOR SELECT TO anon
    USING (true);

CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);


-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
