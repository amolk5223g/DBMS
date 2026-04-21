-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  college TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  usn TEXT NOT NULL,
  department TEXT NOT NULL,
  semester TEXT NOT NULL,
  division TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, usn)
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers view own students" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers insert own students" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers update own students" ON public.students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers delete own students" ON public.students FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_students_filter ON public.students(user_id, department, semester, division);

-- Attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  department TEXT NOT NULL,
  semester TEXT NOT NULL,
  division TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent')),
  marked_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_name, marked_at)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers view own attendance" ON public.attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers insert own attendance" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers update own attendance" ON public.attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers delete own attendance" ON public.attendance FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_attendance_lookup ON public.attendance(user_id, marked_at, subject_name);
CREATE INDEX idx_attendance_undo ON public.attendance(student_id, marked_at, subject_name);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, college)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'college');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();