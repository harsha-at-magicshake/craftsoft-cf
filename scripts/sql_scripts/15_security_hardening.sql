-- ================================================================================
-- 15. SECURITY HARDENING - Linter Fixes
-- Description: Consolidates fixes for Supabase security linter warnings.
-- Run this in your Supabase SQL Editor to secure functions and clean up RLS.
-- ================================================================================

-- 1. FIX: Function Search Path Mutable (Security Hardening)
-- This pins functions to the public schema to prevent search path hijacking.

ALTER FUNCTION public.update_clients_updated_at() SET search_path = public;
ALTER FUNCTION public.update_students_updated_at() SET search_path = public;
ALTER FUNCTION public.update_courses_updated_at() SET search_path = public;
ALTER FUNCTION public.update_tutors_updated_at() SET search_path = public;
ALTER FUNCTION public.update_inquiries_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_inquiry_id() SET search_path = public;
ALTER FUNCTION public.generate_receipt_id(TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.cleanup_old_sessions() SET search_path = public;

-- Explicitly target auto_cleanup functions mentioned in linter
-- Using DO block for safety, but trying to be more specific
DO $$ 
BEGIN 
    -- Fix for public.auto_cleanup_otps
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'auto_cleanup_otps' AND nspname = 'public') THEN
        ALTER FUNCTION public.auto_cleanup_otps() SET search_path = public;
    END IF;
    
    -- Fix for public.auto_cleanup_sessions
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'auto_cleanup_sessions' AND nspname = 'public') THEN
        ALTER FUNCTION public.auto_cleanup_sessions() SET search_path = public;
    END IF;
END $$;


-- 2. FIX: Overly Permissive RLS Policies (Cleanup)
-- These drop legacy or loose policies that bypass security checks.

-- Admins Table
DROP POLICY IF EXISTS "admins_insert_policy" ON admins;

-- Inquiries Table
DROP POLICY IF EXISTS "Admin Management" ON inquiries;
DROP POLICY IF EXISTS "Website Lead Submission" ON inquiries;

-- Payments Table (Crucial: Drop specifically named loose policies)
DROP POLICY IF EXISTS "Allow delete on payments" ON payments;
DROP POLICY IF EXISTS "Allow insert on payments" ON payments;
DROP POLICY IF EXISTS "Allow update on payments" ON payments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments;

-- Student OTPs Table (Crucial: Drop specifically named loose policies)
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON student_otps;
DROP POLICY IF EXISTS "Allow anonymous insert" ON student_otps;

-- Services Table
DROP POLICY IF EXISTS "Allow admin all services" ON services;


-- 3. APPLY: Standardized Hardened RLS Policies
-- Ensures only active admins can manage financial and core records.

-- Payments Table
DROP POLICY IF EXISTS "Active admins can manage payments" ON payments;
CREATE POLICY "Active admins can manage payments" ON payments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE'))
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE'));

-- Receipts Table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON receipts;
DROP POLICY IF EXISTS "Active admins can manage receipts" ON receipts;
CREATE POLICY "Active admins can manage receipts" ON receipts
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE'))
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND status = 'ACTIVE'));

RAISE NOTICE 'Security hardening completed successfully.';
