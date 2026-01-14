-- ================================================================================
-- UNIFIED DATABASE SETUP SCRIPT
-- Application: Abhi's Craftsoft Website
-- Created: 2026-01-14
-- Description: This script combines all database tables, RLS policies, indexes, 
--              and triggers into a single unified execution file.
-- Note: Re-running this script is safe as it uses 'IF NOT EXISTS' and 'DROP IF EXISTS'.
-- ================================================================================

-- --------------------------------------------------------------------------------
-- SECTION 00: DATABASE SETUP & CONFIGURATION
-- --------------------------------------------------------------------------------
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper: Check if user is an active admin
CREATE OR REPLACE FUNCTION is_active_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admins 
        WHERE id = (select auth.uid()) AND status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- --------------------------------------------------------------------------------
-- SECTION 01: ADMINS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_admins" ON admins;
DROP POLICY IF EXISTS "admin_select_admins" ON admins;
DROP POLICY IF EXISTS "admin_update_own" ON admins;
DROP POLICY IF EXISTS "admin_insert" ON admins;
-- Clean up older names
DROP POLICY IF EXISTS "anon_login_lookup" ON admins;
DROP POLICY IF EXISTS "admin_read_own" ON admins;
DROP POLICY IF EXISTS "admin_read_all" ON admins;

CREATE POLICY "anon_select_admins" ON admins
    FOR SELECT TO anon USING (true);

CREATE POLICY "admin_select_admins" ON admins
    FOR SELECT TO authenticated
    USING (
        id = (select auth.uid()) 
        OR 
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "admin_update_own" ON admins
    FOR UPDATE TO authenticated
    USING (id = (select auth.uid()))
    WITH CHECK (id = (select auth.uid()));

CREATE POLICY "admin_insert" ON admins
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
CREATE INDEX IF NOT EXISTS idx_admins_admin_id ON admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS admins_updated_at ON admins;
CREATE TRIGGER admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_admins_updated_at();

-- --------------------------------------------------------------------------------
-- SECTION 02: SERVICES
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    service_id TEXT UNIQUE,
    service_code TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    fee DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_services" ON services;
DROP POLICY IF EXISTS "admin_mutate_services" ON services;
DROP POLICY IF EXISTS "admin_manage_services" ON services;
DROP POLICY IF EXISTS "public_read_services" ON services;

CREATE POLICY "select_services" ON services
    FOR SELECT TO public USING (true);

CREATE POLICY "admin_mutate_services" ON services
    FOR INSERT, UPDATE, DELETE TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_code ON services(service_code);

CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_services_updated_at();

-- --------------------------------------------------------------------------------
-- SECTION 03: COURSES
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT UNIQUE NOT NULL,
    course_code TEXT UNIQUE NOT NULL,
    course_name TEXT NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    duration TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_courses" ON courses;
DROP POLICY IF EXISTS "admin_mutate_courses" ON courses;
DROP POLICY IF EXISTS "admin_manage_courses" ON courses;
DROP POLICY IF EXISTS "public_read_active_courses" ON courses;
DROP POLICY IF EXISTS "admin_read_courses" ON courses;

CREATE POLICY "select_courses" ON courses
    FOR SELECT TO public
    USING (
        status = 'ACTIVE' 
        OR 
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "admin_mutate_courses" ON courses
    FOR INSERT, UPDATE, DELETE TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();

-- --------------------------------------------------------------------------------
-- SECTION 04: TUTORS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    linkedin_url TEXT,
    courses TEXT[],
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tutors" ON tutors;
DROP POLICY IF EXISTS "admin_mutate_tutors" ON tutors;
DROP POLICY IF EXISTS "admin_manage_tutors" ON tutors;
-- Old names
DROP POLICY IF EXISTS "admin_read_tutors" ON tutors;
DROP POLICY IF EXISTS "admin_insert_tutors" ON tutors;
DROP POLICY IF EXISTS "admin_update_tutors" ON tutors;
DROP POLICY IF EXISTS "admin_delete_tutors" ON tutors;

CREATE POLICY "select_tutors" ON tutors
    FOR SELECT TO public
    USING (
        status = 'ACTIVE'
        OR
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "admin_mutate_tutors" ON tutors
    FOR INSERT, UPDATE, DELETE TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_tutors_status ON tutors(status);

CREATE OR REPLACE FUNCTION update_tutors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tutors_updated_at ON tutors;
CREATE TRIGGER tutors_updated_at BEFORE UPDATE ON tutors FOR EACH ROW EXECUTE FUNCTION update_tutors_updated_at();

-- --------------------------------------------------------------------------------
-- SECTION 05: STUDENTS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    courses TEXT[],
    tutors TEXT[],
    demo_scheduled BOOLEAN DEFAULT false,
    demo_date DATE,
    demo_time TEXT,
    joining_date DATE,
    batch_time TEXT,
    fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    final_fee DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    course_tutors JSONB DEFAULT '{}',
    course_discounts JSONB DEFAULT '{}',
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_students" ON students;
DROP POLICY IF EXISTS "admin_mutate_students" ON students;
DROP POLICY IF EXISTS "admin_manage_students" ON students;
DROP POLICY IF EXISTS "Public lookup by ID" ON students;
-- Old names
DROP POLICY IF EXISTS "public_read_students" ON students;
DROP POLICY IF EXISTS "admin_read_students" ON students;
DROP POLICY IF EXISTS "admin_insert_students" ON students;
DROP POLICY IF EXISTS "admin_update_students" ON students;
DROP POLICY IF EXISTS "admin_delete_students" ON students;

CREATE POLICY "select_students" ON students
    FOR SELECT TO public
    USING (
        deleted_at IS NULL
        OR
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "admin_mutate_students" ON students
    FOR INSERT, UPDATE, DELETE TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_demo_date ON students(demo_date);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_students_updated_at();

-- --------------------------------------------------------------------------------
-- SECTION 06: INQUIRIES
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    courses TEXT[],
    source TEXT DEFAULT 'Walk-in' CHECK (source IN ('Walk-in', 'Website', 'Call', 'WhatsApp', 'Instagram')),
    demo_required BOOLEAN DEFAULT false,
    demo_date DATE,
    demo_time TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Demo Scheduled', 'Converted', 'Closed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_select_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_mutate_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_manage_inquiries" ON inquiries;
-- Old names
DROP POLICY IF EXISTS "admin_read_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_insert_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_update_inquiries" ON inquiries;
DROP POLICY IF EXISTS "admin_delete_inquiries" ON inquiries;

CREATE POLICY "anon_insert_inquiries" ON inquiries
    FOR INSERT TO anon
    WITH CHECK (name IS NOT NULL AND phone IS NOT NULL AND length(name) > 0 AND length(phone) > 0);

CREATE POLICY "admin_select_inquiries" ON inquiries
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE POLICY "admin_mutate_inquiries" ON inquiries
    FOR INSERT, UPDATE, DELETE TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_source ON inquiries(source);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);

CREATE OR REPLACE FUNCTION generate_inquiry_id()
RETURNS TEXT AS $$
DECLARE
    v_seq INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(inquiry_id FROM 5) AS INT)), 0) + 1
    INTO v_seq
    FROM inquiries;
    RETURN 'INQ-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS inquiries_updated_at ON inquiries;
CREATE TRIGGER inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION update_inquiries_updated_at();

-- --------------------------------------------------------------------------------
-- SECTION 07: PAYMENTS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE')),
    reference_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED')),
    payment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payments" ON payments;
DROP POLICY IF EXISTS "admin_mutate_payments" ON payments;
DROP POLICY IF EXISTS "admin_manage_payments" ON payments;
DROP POLICY IF EXISTS "public_read_payments" ON payments;
-- Extra cleaning
DROP POLICY IF EXISTS "Admin or Public Read for Payments" ON payments;
DROP POLICY IF EXISTS "Allow read on payments" ON payments;

CREATE POLICY "select_payments" ON payments
    FOR SELECT TO public USING (true);

CREATE POLICY "admin_mutate_payments" ON payments
    FOR INSERT, UPDATE, DELETE TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_service ON payments(service_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- --------------------------------------------------------------------------------
-- SECTION 08: RECEIPTS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    balance_due DECIMAL(10,2) DEFAULT 0,
    payment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_receipts" ON receipts;
DROP POLICY IF EXISTS "admin_mutate_receipts" ON receipts;
DROP POLICY IF EXISTS "admin_manage_receipts" ON receipts;
DROP POLICY IF EXISTS "public_read_receipts" ON receipts;

CREATE POLICY "select_receipts" ON receipts
    FOR SELECT TO public USING (true);

CREATE POLICY "admin_mutate_receipts" ON receipts
    FOR INSERT, UPDATE, DELETE TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_course ON receipts(course_id);
CREATE INDEX IF NOT EXISTS idx_receipts_service ON receipts(service_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_created ON receipts(created_at DESC);

DROP FUNCTION IF EXISTS generate_receipt_id(text, text);
CREATE OR REPLACE FUNCTION generate_receipt_id(
    p_student_name TEXT,
    p_course_code TEXT
) RETURNS TEXT AS $$
DECLARE
    v_seq INT;
    v_initials TEXT;
    v_words TEXT[];
    v_word TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_id FROM 1 FOR 3) AS INT)), 0) + 1 INTO v_seq FROM receipts;
    v_initials := '';
    v_words := string_to_array(UPPER(p_student_name), ' ');
    FOREACH v_word IN ARRAY v_words LOOP
        v_initials := v_initials || SUBSTRING(v_word FROM 1 FOR 1);
    END LOOP;
    RETURN LPAD(v_seq::TEXT, 3, '0') || '-ACS-' || v_initials || '-' || COALESCE(p_course_code, 'SRV');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- --------------------------------------------------------------------------------
-- SECTION 09: ACTIVITIES
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    activity_link TEXT,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_activities" ON activities;
DROP POLICY IF EXISTS "admin_read_activities" ON activities;
DROP POLICY IF EXISTS "admin_insert_activities" ON activities;
DROP POLICY IF EXISTS "admin_delete_activities" ON activities;

CREATE POLICY "admin_manage_activities" ON activities
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'))
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_admin ON activities(admin_id);

-- --------------------------------------------------------------------------------
-- SECTION 10: SETTINGS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_settings" ON settings;
DROP POLICY IF EXISTS "admin_read_settings" ON settings;
DROP POLICY IF EXISTS "admin_insert_settings" ON settings;
DROP POLICY IF EXISTS "admin_update_settings" ON settings;

CREATE POLICY "admin_manage_settings" ON settings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'))
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

ALTER TABLE settings ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO settings (setting_key, setting_value, description) VALUES
    ('institute_name', 'Abhi''s Craftsoft', 'Name of the institute'),
    ('country', 'India', 'Country of operation'),
    ('inactivity_timeout', '30', 'Session timeout in minutes')
ON CONFLICT (setting_key) DO NOTHING;

-- --------------------------------------------------------------------------------
-- SECTION 11: CLIENTS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    services TEXT[],
    service_fees JSONB DEFAULT '{}',
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_clients" ON clients;
DROP POLICY IF EXISTS "admin_mutate_clients" ON clients;
DROP POLICY IF EXISTS "admin_manage_clients" ON clients;
DROP POLICY IF EXISTS "public_read_clients" ON clients;

CREATE POLICY "select_clients" ON clients
    FOR SELECT TO public
    USING (
        deleted_at IS NULL
        OR
        EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE')
    );

CREATE POLICY "admin_mutate_clients" ON clients
    FOR INSERT, UPDATE, DELETE TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted_at);

CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_clients_updated_at();

DO $$
BEGIN
    UPDATE clients SET status = 'ACTIVE' WHERE status NOT IN ('ACTIVE', 'INACTIVE') OR status IS NULL;
    ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
    ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('ACTIVE', 'INACTIVE'));
END $$;

-- --------------------------------------------------------------------------------
-- SECTION 12: STUDENT OTPS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    email_sent_to TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
    is_used BOOLEAN DEFAULT false
);

ALTER TABLE student_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_otps" ON student_otps;
DROP POLICY IF EXISTS "anon_read_valid_otps" ON student_otps;
DROP POLICY IF EXISTS "anon_update_otps" ON student_otps;
DROP POLICY IF EXISTS "admin_manage_otps" ON student_otps;

CREATE POLICY "anon_insert_otps" ON student_otps
    FOR INSERT TO anon
    WITH CHECK (student_id IS NOT NULL AND otp_code IS NOT NULL AND email_sent_to IS NOT NULL);

CREATE POLICY "anon_read_valid_otps" ON student_otps
    FOR SELECT TO anon
    USING (is_used = false AND expires_at > NOW());

CREATE POLICY "anon_update_otps" ON student_otps
    FOR UPDATE TO anon
    USING (is_used = false AND expires_at > NOW())
    WITH CHECK (is_used = true);

CREATE POLICY "admin_manage_otps" ON student_otps
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'))
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = (select auth.uid()) AND status = 'ACTIVE'));

CREATE INDEX IF NOT EXISTS idx_student_otps_student ON student_otps(student_id);
CREATE INDEX IF NOT EXISTS idx_student_otps_expires ON student_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_student_otps_used ON student_otps(is_used);

DROP FUNCTION IF EXISTS auto_cleanup_otps() CASCADE;
CREATE OR REPLACE FUNCTION auto_cleanup_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM student_otps WHERE expires_at < NOW() - INTERVAL '1 day' OR is_used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------------------------------------------
-- SECTION 13: USER SESSIONS
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_admin_tab UNIQUE (admin_id, session_token)
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_own_sessions" ON user_sessions;
-- Old names
DROP POLICY IF EXISTS "admin_read_own_sessions" ON user_sessions;
DROP POLICY IF EXISTS "admin_insert_own_sessions" ON user_sessions;
DROP POLICY IF EXISTS "admin_update_own_sessions" ON user_sessions;
DROP POLICY IF EXISTS "admin_delete_own_sessions" ON user_sessions;

CREATE POLICY "admin_manage_own_sessions" ON user_sessions 
    FOR ALL TO authenticated
    USING (admin_id = (select auth.uid()))
    WITH CHECK (admin_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sessions_admin ON user_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_admin_tab ON user_sessions(admin_id, session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON user_sessions(last_active);

DROP FUNCTION IF EXISTS cleanup_old_sessions() CASCADE;
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE last_active < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS auto_cleanup_sessions() CASCADE;
CREATE OR REPLACE FUNCTION auto_cleanup_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE last_active < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------------------------------------------
-- FINAL STEP: REALTIME ENABLEMENT
-- --------------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE activities;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE payments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE receipts;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE inquiries;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
