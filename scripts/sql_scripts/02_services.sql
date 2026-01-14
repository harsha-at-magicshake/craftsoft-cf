-- ================================================================================
-- 02. SERVICES - Specialized Services
-- Description: Manages specialized services offered by the institute
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    service_id TEXT UNIQUE,                     -- e.g. SERV-001
    service_code TEXT UNIQUE,                   -- e.g. GD, UXD
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    fee DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read services" ON services;
DROP POLICY IF EXISTS "Allow admin all services" ON services;
DROP POLICY IF EXISTS "Allow public read on tutors" ON tutors;
DROP POLICY IF EXISTS "admin_manage_tutors" ON tutors;
DROP POLICY IF EXISTS "admin_mutate_tutors" ON tutors;
DROP POLICY IF EXISTS "select_tutors" ON tutors;
DROP POLICY IF EXISTS "Active admins can manage services" ON services;
DROP POLICY IF EXISTS "Public can read services" ON services;
DROP POLICY IF EXISTS "select_courses" ON courses;
DROP POLICY IF EXISTS "admin_manage_courses" ON courses;
DROP POLICY IF EXISTS "admin_mutate_courses" ON courses;
DROP POLICY IF EXISTS "select_services" ON services;
DROP POLICY IF EXISTS "admin_manage_services" ON services;
DROP POLICY IF EXISTS "admin_mutate_services" ON services;

-- POLICY: Single SELECT access for everyone (anon and authenticated)
CREATE POLICY "select_services" ON services
    FOR SELECT 
    TO public
    USING (true);

-- POLICY: Admin Mutations (Insert, Update, Delete)
CREATE POLICY "admin_mutate_services" ON services
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
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_code ON services(service_code);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at();
