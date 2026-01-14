-- ================================================================================
-- 13. USER_SESSIONS - Session Management
-- Description: Multi-tab session management for admin users
-- Dependencies: admins
-- ================================================================================

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,                -- TAB_ID for multi-tab support
    device_info TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_admin_tab UNIQUE (admin_id, session_token)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can delete own sessions" ON user_sessions;

-- POLICY: Admins can manage only their own sessions
CREATE POLICY "admin_manage_own_sessions" ON user_sessions 
    FOR ALL 
    TO authenticated
    USING (admin_id = (select auth.uid()))
    WITH CHECK (admin_id = (select auth.uid()));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON user_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_admin_tab ON user_sessions(admin_id, session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON user_sessions(last_active);

-- ============================================
-- CLEANUP FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS cleanup_old_sessions() CASCADE;
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE last_active < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Optional: Auto-cleanup function for pg_cron
DROP FUNCTION IF EXISTS auto_cleanup_sessions() CASCADE;
CREATE OR REPLACE FUNCTION auto_cleanup_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE last_active < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
