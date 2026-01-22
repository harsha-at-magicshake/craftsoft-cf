-- ============================================
-- Assignments Module Schema
-- ============================================

-- 1. Main Assignments Table
CREATE TABLE IF NOT EXISTS public.student_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_code TEXT NOT NULL REFERENCES public.courses(course_code),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT, -- Reference or Question Paper
    deadline TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.admins(id),
    status TEXT DEFAULT 'ACTIVE' -- ACTIVE, ARCHIVED
);

-- 2. Submissions Table
CREATE TABLE IF NOT EXISTS public.student_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.student_assignments(id) ON DELETE CASCADE,
    student_db_id UUID NOT NULL REFERENCES public.students(id),
    file_url TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'SUBMITTED', -- SUBMITTED, LATE, GRADED
    grade TEXT,
    feedback TEXT,
    UNIQUE(assignment_id, student_db_id)
);

-- 3. Extension Requests Table
CREATE TABLE IF NOT EXISTS public.assignment_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.student_assignments(id) ON DELETE CASCADE,
    student_db_id UUID NOT NULL REFERENCES public.students(id),
    reason TEXT NOT NULL,
    requested_deadline TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (Basic)
ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_extensions ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins full access on assignments" ON public.student_assignments FOR ALL USING (true);
CREATE POLICY "Admins full access on submissions" ON public.student_submissions FOR ALL USING (true);
CREATE POLICY "Admins full access on extensions" ON public.assignment_extensions FOR ALL USING (true);

-- Students can read assignments for their courses
-- (Detailed RLS logic would check student_courses mapping)
