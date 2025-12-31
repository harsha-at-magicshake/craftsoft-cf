-- ============================================
-- PAYMENTS & RECEIPTS TABLES
-- Run this in Supabase SQL Editor
-- ============================================

-- ⚠️ WARNING: This will create new tables
-- Make sure you don't already have these tables

-- ============================================
-- 1. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE')),
    reference_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    payment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix for existing tables: Add column if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_date') THEN
        ALTER TABLE payments ADD COLUMN payment_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for authenticated users)
-- DROP first to avoid "already exists" error if running multiple times
DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments;
CREATE POLICY "Allow all for authenticated users" ON payments
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable Realtime
-- This might error if already added, but it's usually safe in SQL editor or wrapped in a block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE payments;
    END IF;
END $$;


-- ============================================
-- 2. RECEIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    balance_due DECIMAL(10,2) DEFAULT 0,
    payment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix for existing tables: Add column if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='receipts' AND column_name='payment_date') THEN
        ALTER TABLE receipts ADD COLUMN payment_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_course ON receipts(course_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_created ON receipts(created_at DESC);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for authenticated users)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON receipts;
CREATE POLICY "Allow all for authenticated users" ON receipts
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'receipts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE receipts;
    END IF;
END $$;


-- ============================================
-- 3. HELPER FUNCTION: Generate Receipt ID
-- ============================================
-- Format: {SEQ}-ACS-{StudentInitials}-{CourseCode}
-- Example: 001-ACS-KS-AWS

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
    -- Get next sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_id FROM 1 FOR 3) AS INT)), 0) + 1
    INTO v_seq
    FROM receipts;
    
    -- Get student initials (first letter of each word)
    v_initials := '';
    v_words := string_to_array(UPPER(p_student_name), ' ');
    FOREACH v_word IN ARRAY v_words LOOP
        v_initials := v_initials || SUBSTRING(v_word FROM 1 FOR 1);
    END LOOP;
    
    -- Get course code (first 3 letters, uppercase)
    v_course_code := UPPER(SUBSTRING(REGEXP_REPLACE(p_course_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3));
    
    -- Return formatted receipt ID
    RETURN LPAD(v_seq::TEXT, 3, '0') || '-ACS-' || v_initials || '-' || v_course_code;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Open SQL Editor
-- 3. Paste this entire file
-- 4. Click "Run"
-- 5. Verify tables were created in Table Editor
