-- ============================================
-- SUPABASE DATABASE SETUP - UPDATED
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Drop existing table if needed (CAREFUL: this deletes all data)
-- DROP TABLE IF EXISTS public.admins;

-- Create admins table (if not exists)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id VARCHAR(10) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_admin_id ON public.admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own admin data" ON public.admins;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.admins;
DROP POLICY IF EXISTS "Users can update own admin data" ON public.admins;
DROP POLICY IF EXISTS "Allow anon to read admin lookup data" ON public.admins;
DROP POLICY IF EXISTS "Allow public read for login" ON public.admins;
DROP POLICY IF EXISTS "Allow service role full access" ON public.admins;

-- Policy: Allow everyone to read (needed for admin ID lookup during login)
CREATE POLICY "Allow public read for login" ON public.admins
    FOR SELECT
    USING (true);

-- Policy: Allow authenticated users to update their own data
CREATE POLICY "Users can update own admin data" ON public.admins
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Allow inserts (handled by trigger, but keep for safety)
CREATE POLICY "Allow insert from trigger" ON public.admins
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- FUNCTION: Generate next Admin ID
-- ============================================
CREATE OR REPLACE FUNCTION generate_admin_id()
RETURNS VARCHAR(10) AS $$
DECLARE
    next_num INTEGER;
    new_id VARCHAR(10);
BEGIN
    -- Get the highest existing admin number
    SELECT COALESCE(MAX(CAST(SUBSTRING(admin_id FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.admins;
    
    -- Format as ACS-XX
    new_id := 'ACS-' || LPAD(next_num::TEXT, 2, '0');
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Handle new user signup
-- This runs automatically when a user signs up
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS TRIGGER AS $$
DECLARE
    new_admin_id VARCHAR(10);
BEGIN
    -- Only create admin record if user has admin metadata
    IF NEW.raw_user_meta_data->>'admin_id' IS NOT NULL THEN
        -- Generate the admin ID
        new_admin_id := generate_admin_id();
        
        -- Insert into admins table
        INSERT INTO public.admins (id, admin_id, full_name, email, phone, email_verified, created_at)
        VALUES (
            NEW.id,
            new_admin_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin'),
            NEW.email,
            NEW.raw_user_meta_data->>'phone',
            FALSE,
            NOW()
        );
        
        -- Update the user metadata with the correct admin_id
        UPDATE auth.users 
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_id', new_admin_id)
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-create admin on signup
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_admin();

-- ============================================
-- FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Grant permissions
-- ============================================
GRANT SELECT ON public.admins TO anon;
GRANT SELECT ON public.admins TO authenticated;
GRANT UPDATE ON public.admins TO authenticated;

-- ============================================
-- DONE! 
-- The trigger will now automatically:
-- 1. Generate unique Admin IDs (ACS-01, ACS-02, etc.)
-- 2. Create admin records when users sign up
-- ============================================
