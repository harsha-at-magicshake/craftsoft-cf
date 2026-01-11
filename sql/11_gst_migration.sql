-- Migration script for GST Implementation (Fixed Schema)
-- Run this in Supabase SQL Editor

-- 1. Add Default GST Rate to settings
INSERT INTO settings (setting_key, setting_value)
VALUES ('default_gst_rate', '18')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Update Courses Table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS base_fee DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_fee DECIMAL(12, 2) DEFAULT 0;

-- Migrate existing course fees (Assume existing 'fee' is the total fee)
UPDATE courses 
SET 
    total_fee = fee,
    base_fee = fee / 1.18,
    gst_amount = fee - (fee / 1.18)
WHERE total_fee = 0 AND fee > 0;

-- 3. Update Services Table
ALTER TABLE services ADD COLUMN IF NOT EXISTS base_fee DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS total_fee DECIMAL(12, 2) DEFAULT 0;

-- (Optional) If services had fees previously, migrate them here. 
-- For now, they initialize to 0.
