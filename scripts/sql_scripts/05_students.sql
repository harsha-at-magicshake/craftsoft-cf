-- ================================================================================
-- 05. STUDENTS - Student Records
-- Description: Central student record management.
-- ================================================================================

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
    course_tutors JSONB DEFAULT '{}',
    course_discounts JSONB DEFAULT '{}',
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    deleted_at TIMESTAMPTZ DEFAULT NULL,  -- Soft delete timestamp (NULL = active)
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
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can insert students" ON students
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can update students" ON students
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "Active admins can delete students" ON students
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

-- Payment Page Policy (anon access for public payment lookup)
DROP POLICY IF EXISTS "Public can lookup students by id" ON students;
CREATE POLICY "Public can lookup students by id" ON students
    FOR SELECT TO anon
    USING (true);

-- Verification Portal Policy (public role)
DROP POLICY IF EXISTS "Public can read students for verification" ON students;
CREATE POLICY "Public can read students for verification" ON students
    FOR SELECT TO public
    USING (true);

-- Admins can view all students (authenticated)
DROP POLICY IF EXISTS "Admins can view all students" ON students;
CREATE POLICY "Admins can view all students" ON students
    FOR SELECT TO authenticated
    USING (true);

CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_demo_date ON students(demo_date);


-- Trigger: Auto-update updated_at timestamp
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

-- ================================================================================
-- MIGRATION: Add deleted_at column to existing tables
-- Run this if you already have a students table
-- ================================================================================

-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE students ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
        RAISE NOTICE 'Column deleted_at added to students table';
    ELSE
        RAISE NOTICE 'Column deleted_at already exists';
    END IF;
END $$;

-- Create index for faster queries on active students
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);

-- Ensure all existing students have status = 'ACTIVE' and deleted_at = NULL
UPDATE students SET status = 'ACTIVE', deleted_at = NULL WHERE status IS NULL;
