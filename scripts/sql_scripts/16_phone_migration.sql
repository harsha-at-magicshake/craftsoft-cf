-- ============================================
-- International Phone Number Migration Script
-- Prefixes all existing Indian numbers with "+91 - "
-- Format: +91 - 9492020292
-- ============================================

-- SAFETY CHECK: This script only updates records that:
-- 1. Have exactly 10 digits in the phone field
-- 2. Do NOT already have a '+' prefix (prevents double-prefixing)

-- =====================
-- Migrate Students
-- =====================
UPDATE students 
SET phone = '+91 - ' || phone 
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10 
  AND phone NOT LIKE '+%';

-- =====================
-- Migrate Clients  
-- =====================
UPDATE clients 
SET phone = '+91 - ' || phone 
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10 
  AND phone NOT LIKE '+%';

-- =====================
-- Migrate Tutors
-- =====================
UPDATE tutors 
SET phone = '+91 - ' || phone 
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10 
  AND phone NOT LIKE '+%';

-- =====================
-- Migrate Admins
-- =====================
UPDATE admins 
SET phone = '+91 - ' || phone 
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10 
  AND phone NOT LIKE '+%';

-- =====================
-- Migrate Inquiries
-- =====================
UPDATE inquiries 
SET phone = '+91 - ' || phone 
WHERE phone IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10 
  AND phone NOT LIKE '+%';

-- ============================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================
-- Check sample records:
-- SELECT student_id, first_name, phone FROM students LIMIT 5;
-- SELECT client_id, first_name, phone FROM clients LIMIT 5;
-- SELECT tutor_id, full_name, phone FROM tutors LIMIT 5;
