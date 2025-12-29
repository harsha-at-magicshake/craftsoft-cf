-- ============================================
-- COURSES TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT UNIQUE NOT NULL,          -- C-001, C-002, etc.
    course_code TEXT UNIQUE NOT NULL,        -- GD, UX, MERN, etc.
    course_name TEXT NOT NULL,               -- Graphic Design, UI/UX Design, etc.
    fee DECIMAL(10,2) DEFAULT 0,             -- Course fee (editable)
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    synced_at TIMESTAMPTZ DEFAULT NOW(),     -- Last sync time
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policy: Active admins can read courses
CREATE POLICY "Active admins can read courses" ON courses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Policy: Active admins can insert courses
CREATE POLICY "Active admins can insert courses" ON courses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Policy: Active admins can update courses
CREATE POLICY "Active admins can update courses" ON courses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- ============================================
-- VERIFY: Run this to check table was created
-- ============================================
-- SELECT * FROM courses;


-- ============================================
-- TUTORS TABLE
-- ============================================

-- Create tutors table
CREATE TABLE IF NOT EXISTS tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id TEXT UNIQUE NOT NULL,           -- T-ACS-001, T-ACS-002, etc.
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    linkedin_url TEXT,
    courses TEXT[],                          -- Array of course_codes
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;

-- Policy: Active admins can read tutors
CREATE POLICY "Active admins can read tutors" ON tutors
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Policy: Active admins can insert tutors
CREATE POLICY "Active admins can insert tutors" ON tutors
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Policy: Active admins can update tutors
CREATE POLICY "Active admins can update tutors" ON tutors
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Policy: Active admins can delete tutors
CREATE POLICY "Active admins can delete tutors" ON tutors
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tutors_status ON tutors(status);
CREATE INDEX IF NOT EXISTS idx_tutors_phone ON tutors(phone);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tutors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tutors_updated_at ON tutors;
CREATE TRIGGER tutors_updated_at
    BEFORE UPDATE ON tutors
    FOR EACH ROW
    EXECUTE FUNCTION update_tutors_updated_at();

-- ============================================
-- VERIFY: Run this to check tutors table
-- ============================================
-- SELECT * FROM tutors;


-- ============================================
-- STUDENTS TABLE
-- ============================================

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,          -- St-ACS-001, St-ACS-002, etc.
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    courses TEXT[],                           -- Array of course_codes
    tutors TEXT[],                            -- Array of tutor_ids
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

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy: Active admins can read students
CREATE POLICY "Active admins can read students" ON students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Policy: Active admins can insert students
CREATE POLICY "Active admins can insert students" ON students
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Policy: Active admins can update students
CREATE POLICY "Active admins can update students" ON students
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Policy: Active admins can delete students
CREATE POLICY "Active admins can delete students" ON students
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_courses ON students USING GIN(courses);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_students_updated_at();

-- ============================================
-- VERIFY: Run this to check students table
-- ============================================
-- SELECT * FROM students;
