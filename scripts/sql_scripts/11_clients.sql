-- ================================================================================
-- 11. CLIENTS - Service Clients
-- Description: Client records for service inquiries converted to active clients
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT UNIQUE NOT NULL,             -- e.g. CL-ACS-001
    first_name TEXT NOT NULL,
    last_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    services TEXT[],                            -- Array of service IDs
    service_fees JSONB DEFAULT '{}',            -- Fees per service
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    deleted_at TIMESTAMPTZ,                     -- Soft delete
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated access" ON clients;
DROP POLICY IF EXISTS "Active admins can manage clients" ON clients;
DROP POLICY IF EXISTS "Public can lookup clients by id" ON clients;
DROP POLICY IF EXISTS "Public can read clients for verification" ON clients;
DROP POLICY IF EXISTS "select_clients" ON clients;
DROP POLICY IF EXISTS "admin_manage_clients" ON clients;

-- POLICY: Global SELECT access for clients
CREATE POLICY "select_clients" ON clients
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
CREATE POLICY "admin_mutate_clients" ON clients
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
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted_at);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_clients_updated_at();

-- ============================================
-- MIGRATION: Ensure proper constraints
-- ============================================
DO $$
BEGIN
    -- Normalize existing statuses
    UPDATE clients SET status = 'ACTIVE' 
    WHERE status NOT IN ('ACTIVE', 'INACTIVE') OR status IS NULL;
    
    -- Drop old constraint if exists
    ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
    
    -- Add proper constraint
    ALTER TABLE clients ADD CONSTRAINT clients_status_check 
    CHECK (status IN ('ACTIVE', 'INACTIVE'));
END $$;
