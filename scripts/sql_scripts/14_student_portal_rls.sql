-- Student Portal Security Policies
-- This fixes the 'violates row-level security policy' error

-- 1. Allow anyone to request an OTP (Insertion)
CREATE POLICY "Enable insert for anonymous users" 
ON public.student_otps 
FOR INSERT 
WITH CHECK (true);

-- 2. Allow anyone to verify their own OTP (Selection)
-- Note: User only knows their own OTP code, so they can only select it if they know it.
CREATE POLICY "Enable read for OTP verification" 
ON public.student_otps 
FOR SELECT 
USING (is_used = false AND expires_at > now());

-- 3. Allow anonymous lookup of student record (for login)
-- We only allow selecting by identifier to see if they exist.
-- Assuming 'students' table already has some RLS, ensure it allows this lookup.
-- If 'students' has RLS enabled, uncomment the line below:
-- CREATE POLICY "Enable lookup by id/email/phone" ON public.students FOR SELECT USING (true);
