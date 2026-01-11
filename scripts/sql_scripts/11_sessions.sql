-- ================================================================================
-- 11. SESSIONS - User Session Management
-- Description: Multi-tab session management for admin users.
-- ================================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL, -- TAB_ID
    device_info TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_admin_tab UNIQUE (admin_id, session_token)
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can delete own sessions" ON user_sessions;

CREATE POLICY "Admins can read own sessions" ON user_sessions 
    FOR SELECT USING (admin_id = (select auth.uid()));
    
CREATE POLICY "Admins can insert own sessions" ON user_sessions 
    FOR INSERT WITH CHECK (admin_id = (select auth.uid()));
    
CREATE POLICY "Admins can update own sessions" ON user_sessions 
    FOR UPDATE USING (admin_id = (select auth.uid()));
    
CREATE POLICY "Admins can delete own sessions" ON user_sessions 
    FOR DELETE USING (admin_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sessions_admin_tab ON user_sessions(admin_id, session_token);

-- Function: Cleanup old sessions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE last_active < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
