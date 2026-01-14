-- ================================================================================
-- 07. PAYMENTS - Payment Transactions
-- Description: Financial tracking for student course fees
-- Dependencies: students, courses, services
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,   -- Nullable for services
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE')),
    reference_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED')),
    payment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments;
DROP POLICY IF EXISTS "Active admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Public can read payments for balance" ON payments;
DROP POLICY IF EXISTS "Allow delete on payments" ON payments;
DROP POLICY IF EXISTS "Allow insert on payments" ON payments;
DROP POLICY IF EXISTS "Allow update on payments" ON payments;
DROP POLICY IF EXISTS "Admin or Public Read for Payments" ON payments;
DROP POLICY IF EXISTS "Allow read on payments" ON payments;
DROP POLICY IF EXISTS "select_payments" ON payments;
DROP POLICY IF EXISTS "admin_manage_payments" ON payments;

-- POLICY: Global read access for payments
CREATE POLICY "select_payments" ON payments
    FOR SELECT 
    TO public
    USING (true);

-- POLICY: Active admins can manage all payments (Insert, Update, Delete)
CREATE POLICY "admin_manage_payments" ON payments
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
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_service ON payments(service_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
