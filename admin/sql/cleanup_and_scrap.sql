-- ============================================
-- CLEANUP SCRIPT: Scrap Admin Module
-- ============================================

-- 1. Drop Views
DROP VIEW IF EXISTS student_summary;

-- 2. Drop Tables (in order of dependencies)
DROP TABLE IF EXISTS fee_payments CASCADE;
DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS discount_settings CASCADE;
DROP TABLE IF EXISTS receipt_sequence CASCADE;
DROP TABLE IF EXISTS institute_settings CASCADE;

-- 3. Drop Functions
DROP FUNCTION IF EXISTS get_next_receipt_number();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 4. Remove Triggers (Cascaded by functions usually, but for safety)
-- Triggers are dropped when tables are dropped CASCADE.

-- DONE! Your database is now clean of all admin-related structures.
