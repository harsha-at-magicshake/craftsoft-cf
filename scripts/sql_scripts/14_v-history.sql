-- ============================================
-- CraftSoft vHistory - Database Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create the version history table
CREATE TABLE IF NOT EXISTS version_history (
    id SERIAL PRIMARY KEY,
    version VARCHAR(10) NOT NULL UNIQUE,
    focus VARCHAR(255) NOT NULL,
    milestones TEXT NOT NULL,
    release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON version_history
    FOR SELECT USING (true);

-- Allow authenticated admins to manage
CREATE POLICY "Allow admin manage" ON version_history
    FOR ALL USING (auth.role() = 'authenticated');

-- Seed Data (Matches Admin v5.0 Master Plan)
INSERT INTO version_history (version, focus, milestones) VALUES
('v1.0', 'The Foundation', 'Initial CRM launch. Basic management of Students, Clients, and Payments. Core Supabase integration.'),
('v2.0', 'Portal Launch', 'Introduction of the Student Portal. First iteration of Payment History and mobile-responsive dashboards.'),
('v3.0', 'Intelligence & UX', 'Introduction of Spotlight Search (Ctrl+K), real-time Desktop Notifications, and advanced analytics on the Admin dashboard.'),
('v4.0', 'Scale & Security', 'Launch of the Gmail-style Account Manager (multi-login) and the Session Timeout / Inactivity Lock security system.'),
('v5.0', 'CraftSoft OS', 'UI Standardisation. Modular Sidebar/Header JS engines across portals, relocation of Assets, and premium Logo Signature branding.')
ON CONFLICT (version) DO UPDATE 
SET focus = EXCLUDED.focus, milestones = EXCLUDED.milestones;

-- Comments
COMMENT ON TABLE version_history IS 'Tracking the evolution and roadmap of the CraftSoft platform';
