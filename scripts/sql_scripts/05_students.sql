-- ================================================================================
-- 05. STUDENTS - Student Records
-- Description: Central student record management
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,            -- e.g. STU-001
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    courses TEXT[],                             -- Array of course codes
    tutors TEXT[],                              -- Array of tutor IDs
    demo_scheduled BOOLEAN DEFAULT false,
    demo_date DATE,
    demo_time TEXT,
    joining_date DATE,
    batch_time TEXT,
    fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    final_fee DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    course_tutors JSONB DEFAULT '{}',           -- Maps course -> tutor
    course_discounts JSONB DEFAULT '{}',        -- Maps course -> discount
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    deleted_at TIMESTAMPTZ DEFAULT NULL,        -- Soft delete timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Active admins can read students" ON students;
DROP POLICY IF EXISTS "Active admins can insert students" ON students;
DROP POLICY IF EXISTS "Active admins can update students" ON students;
DROP POLICY IF EXISTS "Active admins can delete students" ON students;
DROP POLICY IF EXISTS "Public can lookup students by id" ON students;
DROP POLICY IF EXISTS "Public can read students for verification" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Public lookup by ID" ON students;
DROP POLICY IF EXISTS "select_students" ON students;
DROP POLICY IF EXISTS "admin_manage_students" ON students;

-- POLICY: Global SELECT access (Public and Admins)
-- Note: Soft-deleted students are hidden by default from non-admins
CREATE POLICY "select_students" ON students
    FOR SELECT 
    TO public
    USING (
        deleted_at IS NULL
        OR
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = (select auth.uid()) AND status = 'ACTIVE'
        )
    );

-- POLICY: Admin Mutations (Insert, Update, Delete)
CREATE POLICY "admin_mutate_students" ON students
    FOR INSERT, UPDATE, DELETE
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = (select auth.uid()) AND status = 'ACTIVE'
        )
    );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_demo_date ON students(demo_date);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_students_updated_at();

-- ============================================
-- MIGRATION: Add deleted_at column if missing
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE students ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;
