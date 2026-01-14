-- ================================================================================
-- 06. INQUIRIES - Leads & Inquiries
-- Description: Leads and inquiries from website and walk-ins
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id TEXT UNIQUE NOT NULL,            -- e.g. INQ-0001
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    courses TEXT[],                             -- Array of course codes
    source TEXT DEFAULT 'Walk-in' CHECK (source IN ('Walk-in', 'Website', 'Call', 'WhatsApp', 'Instagram')),
    demo_required BOOLEAN DEFAULT false,
    demo_date DATE,
    demo_time TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Demo Scheduled', 'Converted', 'Closed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Active admins can read inquiries" ON inquiries;
DROP POLICY IF EXISTS "Active admins can insert inquiries" ON inquiries;
DROP POLICY IF EXISTS "Active admins can update inquiries" ON inquiries;
DROP POLICY IF EXISTS "Active admins can delete inquiries" ON inquiries;
DROP POLICY IF EXISTS "Website can submit inquiries" ON inquiries;
DROP POLICY IF EXISTS "Active admins can manage inquiries" ON inquiries;
DROP POLICY IF EXISTS "Anyone can insert inquiries" ON inquiries;
DROP POLICY IF EXISTS "Authenticated users can view inquiries" ON inquiries;
DROP POLICY IF EXISTS "Authenticated users can update inquiries" ON inquiries;
DROP POLICY IF EXISTS "Authenticated users can delete inquiries" ON inquiries;
DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;
DROP POLICY IF EXISTS "auth_delete_inquiries" ON inquiries;
DROP POLICY IF EXISTS "auth_update_inquiries" ON inquiries;
DROP POLICY IF EXISTS "auth_select_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_select_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_insert_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_update_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_delete_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_manage_inquiries" ON inquiries;
DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;

-- POLICY: Anonymous users can INSERT inquiries (website form submissions)
CREATE POLICY "anon_insert_inquiries" ON inquiries
    FOR INSERT 
    TO anon
    WITH CHECK (
        name IS NOT NULL AND 
        phone IS NOT NULL AND 
        length(name) > 0 AND 
        length(phone) > 0
    );

-- POLICY: Admin SELECT access for inquiries
CREATE POLICY "admin_select_inquiries" ON inquiries
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = (select auth.uid()) AND status = 'ACTIVE'
        )
    );

-- POLICY: Admin Mutations (Insert, Update, Delete)
CREATE POLICY "admin_mutate_inquiries" ON inquiries
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
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_source ON inquiries(source);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Generate Inquiry ID (e.g. INQ-0001)
CREATE OR REPLACE FUNCTION generate_inquiry_id()
RETURNS TEXT AS $$
DECLARE
    v_seq INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(inquiry_id FROM 5) AS INT)), 0) + 1
    INTO v_seq
    FROM inquiries;
    RETURN 'INQ-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS inquiries_updated_at ON inquiries;
CREATE TRIGGER inquiries_updated_at
    BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE FUNCTION update_inquiries_updated_at();
