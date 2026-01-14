-- ================================================================================
-- 01. ADMINS - Admin Users & Authentication
-- Description: Admin user management with secure RLS policies
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id TEXT UNIQUE NOT NULL,              -- e.g. ADM-001
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow lookup by admin_id" ON admins;
DROP POLICY IF EXISTS "Allow read own record" ON admins;
DROP POLICY IF EXISTS "admins_select" ON admins;
DROP POLICY IF EXISTS "Admins can read own record" ON admins;
DROP POLICY IF EXISTS "Allow public lookup" ON admins;
DROP POLICY IF EXISTS "Enable public lookup by admin_id" ON admins;
DROP POLICY IF EXISTS "Allow login lookup" ON admins;
DROP POLICY IF EXISTS "Allow update own record" ON admins;
DROP POLICY IF EXISTS "admins_update" ON admins;
DROP POLICY IF EXISTS "admins_insert_policy" ON admins;
DROP POLICY IF EXISTS "Active admins can insert admins" ON admins;
DROP POLICY IF EXISTS "anon_login_lookup" ON admins;
DROP POLICY IF EXISTS "admin_read_own" ON admins;
DROP POLICY IF EXISTS "admin_read_all" ON admins;
DROP POLICY IF EXISTS "anon_select_admins" ON admins;
DROP POLICY IF EXISTS "admin_select_admins" ON admins;
DROP POLICY IF EXISTS "admin_insert" ON admins;
DROP POLICY IF EXISTS "admin_update_own" ON admins;

-- POLICY: Anonymous login lookup
CREATE POLICY "anon_select_admins" ON admins
    FOR SELECT 
    TO anon
    USING (true);

-- POLICY: Combined SELECT policy for authenticated users
CREATE POLICY "admin_select_admins" ON admins
    FOR SELECT 
    TO authenticated
    USING (
        id = (select auth.uid()) 
        OR 
        EXISTS (
            SELECT 1 FROM admins a 
            WHERE a.id = (select auth.uid()) AND a.status = 'ACTIVE'
        )
    );

-- POLICY: Admins can update their own record
CREATE POLICY "admin_update_own" ON admins
    FOR UPDATE 
    TO authenticated
    USING (id = (select auth.uid()))
    WITH CHECK (id = (select auth.uid()));

-- POLICY: Only active admins can create new admin accounts
CREATE POLICY "admin_insert" ON admins
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins a 
            WHERE a.id = (select auth.uid()) AND a.status = 'ACTIVE'
        )
    );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
CREATE INDEX IF NOT EXISTS idx_admins_admin_id ON admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS admins_updated_at ON admins;
CREATE TRIGGER admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_admins_updated_at();
