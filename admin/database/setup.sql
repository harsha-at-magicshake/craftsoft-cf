-- ============================================
-- SUPABASE DATABASE SETUP - SIMPLIFIED
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- First, drop the problematic trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_admin();
DROP FUNCTION IF EXISTS generate_admin_id();

-- Drop existing table and recreate fresh
DROP TABLE IF EXISTS public.admins;

-- Create admins table
CREATE TABLE public.admins (
    id UUID PRIMARY KEY,
    admin_id VARCHAR(10) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_admins_admin_id ON public.admins(admin_id);
CREATE INDEX idx_admins_email ON public.admins(email);

-- Disable RLS completely for admins table (only 3 admins, not public)
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;

-- Grant full access
GRANT ALL ON public.admins TO anon;
GRANT ALL ON public.admins TO authenticated;

-- Create sequence for admin IDs
CREATE SEQUENCE IF NOT EXISTS admin_id_seq START 1;

-- Function to get next admin ID
CREATE OR REPLACE FUNCTION get_next_admin_id()
RETURNS VARCHAR(10) AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(admin_id FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.admins;
    
    RETURN 'ACS-' || LPAD(next_num::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_next_admin_id() TO anon;
GRANT EXECUTE ON FUNCTION get_next_admin_id() TO authenticated;

-- ============================================
-- DONE! 
-- RLS is disabled - admins table is open
-- This is fine since it's only for 3 admin accounts
-- ============================================
