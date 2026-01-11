-- ================================================================================
-- 08. RECEIPTS - Payment Receipts
-- Description: Receipt generation and storage for payments.
-- ================================================================================

CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,  -- Nullable to support clients
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,    -- For service clients
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,    -- Nullable to support Services
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    balance_due DECIMAL(10,2) DEFAULT 0,
    payment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "Allow all for authenticated users" ON receipts;
DROP POLICY IF EXISTS "Active admins can manage receipts" ON receipts;
CREATE POLICY "Active admins can manage receipts" ON receipts
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

-- Verification Portal (anon)
DROP POLICY IF EXISTS "Public can lookup receipts" ON receipts;
CREATE POLICY "Public can lookup receipts" ON receipts
    FOR SELECT TO anon
    USING (true);

-- Verification Portal (public role)
DROP POLICY IF EXISTS "Public can read receipts for verification" ON receipts;
CREATE POLICY "Public can read receipts for verification" ON receipts
    FOR SELECT TO public
    USING (true);

CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_course ON receipts(course_id);
CREATE INDEX IF NOT EXISTS idx_receipts_service ON receipts(service_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_created ON receipts(created_at DESC);


-- Function: Generate Receipt ID
-- Format: 001-ACS-JD-GRA (sequence-institute-initials-course)
CREATE OR REPLACE FUNCTION generate_receipt_id(
    p_student_name TEXT,
    p_course_name TEXT
) RETURNS TEXT AS $$
DECLARE
    v_seq INT;
    v_initials TEXT;
    v_course_code TEXT;
    v_words TEXT[];
    v_word TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_id FROM 1 FOR 3) AS INT)), 0) + 1
    INTO v_seq
    FROM receipts;
    
    v_initials := '';
    v_words := string_to_array(UPPER(p_student_name), ' ');
    FOREACH v_word IN ARRAY v_words LOOP
        v_initials := v_initials || SUBSTRING(v_word FROM 1 FOR 1);
    END LOOP;
    
    RETURN LPAD(v_seq::TEXT, 3, '0') || '-ACS-' || v_initials || '-' || v_course_code;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
