-- ================================================================================
-- 12. CLIENTS - Service Clients
-- Description: Client records for service inquiries converted to active clients.
-- ================================================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT UNIQUE NOT NULL,           -- e.g. CL-ACS-001
    first_name TEXT NOT NULL,
    last_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    services TEXT[],                          -- Array of service IDs
    service_fees JSONB DEFAULT '{}',          -- Fees per service
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE', -- Removed initial CHECK for easier migration
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================================
-- MIGRATION: Fix Status Constraint & Normalize
-- Run this to allow INACTIVE status and clean up old ones
-- ================================================================================
DO $$
BEGIN
    -- 1. Normalize existing statuses to ACTIVE if they are weird
    UPDATE clients SET status = 'ACTIVE' WHERE status NOT IN ('ACTIVE', 'INACTIVE') OR status IS NULL;
    
    -- 2. Drop old constraint if it exists
    ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
    
    -- 3. Add modern constraint
    ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('ACTIVE', 'INACTIVE'));

    -- 4. Ensure deleted_at exists (if updating from very old version)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'deleted_at') THEN
        ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Admin management (only active admins)
DROP POLICY IF EXISTS "Allow authenticated access" ON clients;
DROP POLICY IF EXISTS "Active admins can manage clients" ON clients;
CREATE POLICY "Active admins can manage clients" ON clients
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );


-- Public read for verification portal (anon)
DROP POLICY IF EXISTS "Public can lookup clients by id" ON clients;
CREATE POLICY "Public can lookup clients by id" ON clients
    FOR SELECT TO anon
    USING (true);

-- Public read for verification portal (public role)
DROP POLICY IF EXISTS "Public can read clients for verification" ON clients;
CREATE POLICY "Public can read clients for verification" ON clients
    FOR SELECT TO public
    USING (true);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_clients_updated_at();
