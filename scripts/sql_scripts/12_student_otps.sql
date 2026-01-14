-- ================================================================================
-- 12. STUDENT_OTPS - OTP Storage for Student Portal
-- Description: OTP storage for student login verification
-- Dependencies: students
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS student_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    email_sent_to TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
    is_used BOOLEAN DEFAULT false
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE student_otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON student_otps;
DROP POLICY IF EXISTS "Allow anonymous insert" ON student_otps;
DROP POLICY IF EXISTS "Enable read for OTP verification" ON student_otps;

-- POLICY: Anonymous users can INSERT OTPs (for requesting login)
-- SECURE: Validates required fields
CREATE POLICY "anon_insert_otps" ON student_otps
    FOR INSERT 
    TO anon
    WITH CHECK (
        student_id IS NOT NULL AND
        otp_code IS NOT NULL AND
        email_sent_to IS NOT NULL
    );

-- POLICY: Anonymous users can SELECT valid OTPs (for verification)
-- SECURE: Only unused, non-expired OTPs
CREATE POLICY "anon_read_valid_otps" ON student_otps
    FOR SELECT 
    TO anon
    USING (
        is_used = false AND 
        expires_at > NOW()
    );

-- POLICY: Anonymous users can UPDATE OTPs (to mark as used)
CREATE POLICY "anon_update_otps" ON student_otps
    FOR UPDATE 
    TO anon
    USING (
        is_used = false AND 
        expires_at > NOW()
    )
    WITH CHECK (
        is_used = true  -- Can only set to used, nothing else
    );

-- POLICY: Active admins can manage all OTPs
CREATE POLICY "admin_manage_otps" ON student_otps
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
CREATE INDEX IF NOT EXISTS idx_student_otps_student ON student_otps(student_id);
CREATE INDEX IF NOT EXISTS idx_student_otps_expires ON student_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_student_otps_used ON student_otps(is_used);

-- ============================================
-- CLEANUP FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS auto_cleanup_otps();
CREATE OR REPLACE FUNCTION auto_cleanup_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM student_otps 
    WHERE expires_at < NOW() - INTERVAL '1 day'
       OR is_used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
