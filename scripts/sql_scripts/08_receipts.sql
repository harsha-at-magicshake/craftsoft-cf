-- ================================================================================
-- 08. RECEIPTS - Payment Receipts
-- Description: Receipt generation and storage for payments
-- Dependencies: payments, students, clients, courses, services
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,                -- e.g. 001-ACS-JD-GRA
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,    -- Nullable for clients
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,      -- For service clients
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,      -- Nullable for services
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    balance_due DECIMAL(10,2) DEFAULT 0,
    payment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON receipts;
DROP POLICY IF EXISTS "Active admins can manage receipts" ON receipts;
DROP POLICY IF EXISTS "Public can lookup receipts" ON receipts;
DROP POLICY IF EXISTS "Public can read receipts for verification" ON receipts;
DROP POLICY IF EXISTS "select_receipts" ON receipts;
DROP POLICY IF EXISTS "admin_manage_receipts" ON receipts;

-- POLICY: Global SELECT access for receipts
CREATE POLICY "select_receipts" ON receipts
    FOR SELECT 
    TO public
    USING (true);

-- POLICY: Active admins can manage all receipts (Insert, Update, Delete)
CREATE POLICY "admin_manage_receipts" ON receipts
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = (select auth.uid()) AND status = 'ACTIVE'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE id = (select auth.uid()) AND status = 'ACTIVE'
        )
    );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_course ON receipts(course_id);
CREATE INDEX IF NOT EXISTS idx_receipts_service ON receipts(service_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_created ON receipts(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Generate Receipt ID
-- Format: 001-ACS-JD-GRA (sequence-institute-initials-course)
CREATE OR REPLACE FUNCTION generate_receipt_id(
    p_student_name TEXT,
    p_course_code TEXT
) RETURNS TEXT AS $$
DECLARE
    v_seq INT;
    v_initials TEXT;
    v_words TEXT[];
    v_word TEXT;
BEGIN
    -- Get next sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_id FROM 1 FOR 3) AS INT)), 0) + 1
    INTO v_seq
    FROM receipts;
    
    -- Build initials from student name
    v_initials := '';
    v_words := string_to_array(UPPER(p_student_name), ' ');
    FOREACH v_word IN ARRAY v_words LOOP
        v_initials := v_initials || SUBSTRING(v_word FROM 1 FOR 1);
    END LOOP;
    
    RETURN LPAD(v_seq::TEXT, 3, '0') || '-ACS-' || v_initials || '-' || COALESCE(p_course_code, 'SRV');
END;
$$ LANGUAGE plpgsql
SET search_path = public;
