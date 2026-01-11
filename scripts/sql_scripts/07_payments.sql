-- ================================================================================
-- 07. PAYMENTS - Payment Transactions
-- Description: Financial tracking for student course fees.
-- ================================================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- Nullable to support Services
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE')),
    reference_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    payment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments;
DROP POLICY IF EXISTS "Active admins can manage payments" ON payments;
CREATE POLICY "Active admins can manage payments" ON payments
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE')
    );

-- Public Payment Page Policy (for balance lookup)
DROP POLICY IF EXISTS "Public can read payments for balance" ON payments;
CREATE POLICY "Public can read payments for balance" ON payments
    FOR SELECT TO anon
    USING (true);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_service ON payments(service_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
