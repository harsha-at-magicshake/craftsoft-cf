-- Database Updates for Soft Delete & Recovery System

-- 1. Add deleted_at column to main tables
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add Settings Support (if not exists)
-- ensure 'retention_period' can be stored in settings table
-- (Assuming settings table is key-value, no schema change needed usually)
