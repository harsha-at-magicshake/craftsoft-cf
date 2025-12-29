-- ============================================
-- CRAFTSOFT ADMIN DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. COURSES TABLE
-- ============================================
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
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can insert courses" ON courses
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can update courses" ON courses
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();


-- ============================================
-- 2. TUTORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    linkedin_url TEXT,
    courses TEXT[],
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
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can insert tutors" ON tutors
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can update tutors" ON tutors
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can delete tutors" ON tutors
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE INDEX IF NOT EXISTS idx_tutors_status ON tutors(status);

CREATE OR REPLACE FUNCTION update_tutors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tutors_updated_at ON tutors;
CREATE TRIGGER tutors_updated_at
    BEFORE UPDATE ON tutors
    FOR EACH ROW EXECUTE FUNCTION update_tutors_updated_at();


-- ============================================
-- 3. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    courses TEXT[],
    tutors TEXT[],
    demo_scheduled BOOLEAN DEFAULT false,
    demo_date DATE,
    demo_time TEXT,
    joining_date DATE,
    batch_time TEXT,
    fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    final_fee DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins can read students" ON students;
DROP POLICY IF EXISTS "Active admins can insert students" ON students;
DROP POLICY IF EXISTS "Active admins can update students" ON students;
DROP POLICY IF EXISTS "Active admins can delete students" ON students;

CREATE POLICY "Active admins can read students" ON students
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can insert students" ON students
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can update students" ON students
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can delete students" ON students
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_demo_date ON students(demo_date);

CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_students_updated_at();


-- ============================================
-- 4. ACTIVITIES TABLE (Real-time feed)
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    activity_link TEXT,
    admin_id UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins can read activities" ON activities;
DROP POLICY IF EXISTS "Active admins can insert activities" ON activities;
DROP POLICY IF EXISTS "Active admins can delete activities" ON activities;

CREATE POLICY "Active admins can read activities" ON activities
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can insert activities" ON activities
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can delete activities" ON activities
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- Enable Realtime for activities (run separately if error)
-- ALTER PUBLICATION supabase_realtime ADD TABLE activities;


-- ============================================
-- 5. INQUIRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    courses TEXT[],
    source TEXT DEFAULT 'Walk-in' CHECK (source IN ('Walk-in', 'Website', 'Call', 'WhatsApp', 'Instagram')),
    demo_required BOOLEAN DEFAULT false,
    demo_date DATE,
    demo_time TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Demo Scheduled', 'Converted', 'Closed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins can read inquiries" ON inquiries;
DROP POLICY IF EXISTS "Active admins can insert inquiries" ON inquiries;
DROP POLICY IF EXISTS "Active admins can update inquiries" ON inquiries;
DROP POLICY IF EXISTS "Active admins can delete inquiries" ON inquiries;

CREATE POLICY "Active admins can read inquiries" ON inquiries
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can insert inquiries" ON inquiries
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can update inquiries" ON inquiries
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can delete inquiries" ON inquiries
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inquiries_updated_at ON inquiries;
CREATE TRIGGER inquiries_updated_at
    BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE FUNCTION update_inquiries_updated_at();


-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- SELECT * FROM courses;
-- SELECT * FROM tutors;
-- SELECT * FROM students;
-- SELECT * FROM activities;
-- SELECT * FROM inquiries;
