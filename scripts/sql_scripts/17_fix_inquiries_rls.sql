-- ============================================
-- Fix RLS Policy for Inquiries Table
-- Allows anonymous (website users) to submit inquiries
-- ============================================

-- Enable RLS on inquiries table (if not already enabled)
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous insert" ON inquiries;
DROP POLICY IF EXISTS "Allow anon insert inquiries" ON inquiries;
DROP POLICY IF EXISTS "Anyone can insert inquiries" ON inquiries;

-- Create policy to allow anonymous users to INSERT inquiries
-- This is needed for website form submissions
CREATE POLICY "Anyone can insert inquiries"
ON inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to SELECT all inquiries
-- This is needed for admin panel to view inquiries
CREATE POLICY "Authenticated users can view inquiries"
ON inquiries
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to UPDATE inquiries
-- This is needed for admin panel to edit inquiries
CREATE POLICY "Authenticated users can update inquiries"
ON inquiries
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to DELETE inquiries
-- This is needed for admin panel to delete inquiries
CREATE POLICY "Authenticated users can delete inquiries"
ON inquiries
FOR DELETE
TO authenticated
USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'inquiries';
