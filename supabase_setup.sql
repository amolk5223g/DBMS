-- SQL Setup for Visionary Attendance
-- Run this in the Supabase SQL Editor

-- 1. Students Table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    usn TEXT NOT NULL,
    department TEXT NOT NULL,
    semester TEXT NOT NULL,
    division TEXT NOT NULL,
    UNIQUE(user_id, usn)
);

-- 2. Attendance Table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    department TEXT NOT NULL,
    semester TEXT NOT NULL,
    division TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    marked_at DATE NOT NULL,
    UNIQUE(student_id, subject_name, marked_at)
);

-- 3. Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Students
CREATE POLICY "Users can manage their own students"
ON public.students
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. RLS Policies for Attendance
CREATE POLICY "Users can manage their own attendance records"
ON public.attendance
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Indexes for better performance
CREATE INDEX idx_students_user_id ON public.students(user_id);
CREATE INDEX idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX idx_attendance_marked_at ON public.attendance(marked_at);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
