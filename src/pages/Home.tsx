import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, BookOpen, Users, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [division, setDivision] = useState("");
  const [stats, setStats] = useState({ students: 0, sessions: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: s }, { data: a }] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("attendance").select("subject_name, marked_at"),
      ]);
      const sessions = new Set((a ?? []).map(r => `${r.subject_name}|${r.marked_at}`)).size;
      setStats({ students: s ?? 0, sessions });
    })();
  }, [user]);

  // Pre-fetch trick: warm the students query when subject typing starts
  useEffect(() => {
    if (subject.length === 1) supabase.from("students").select("id").limit(1);
  }, [subject]);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    const { count } = await supabase.from("students").select("*", { count: "exact", head: true })
      .eq("department", department).eq("semester", semester).eq("division", division);
    if (!count) return toast.error("No students found for that class. Add students first.");
    const params = new URLSearchParams({ subject, department, semester, division });
    navigate(`/session?${params}`);
  };

  return (
    <AppShell>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <StatCard icon={Users} label="Students" value={stats.students} />
        <StatCard icon={ClipboardCheck} label="Sessions logged" value={stats.sessions} />
        <StatCard icon={BookOpen} label="Today" value={new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" })} />
      </div>

      <div className="perspective-scene">
        <form onSubmit={start} className="glass-card rounded-3xl p-6 md:p-8 space-y-5 max-w-2xl mx-auto"
              style={{ transform: "rotateX(1deg)" }}>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Start a <span className="aurora-text">session</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Lock the subject and class. Then mark in seconds.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Subject"><Input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Data Structures" /></Field>
            <Field label="Department"><Input required value={department} onChange={e => setDepartment(e.target.value)} placeholder="CSE" /></Field>
            <Field label="Semester"><Input required value={semester} onChange={e => setSemester(e.target.value)} placeholder="5" /></Field>
            <Field label="Division"><Input required value={division} onChange={e => setDivision(e.target.value)} placeholder="A" /></Field>
          </div>
          <Button type="submit" className="w-full neu-fab text-background font-semibold h-12 text-base">
            Begin marking <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>
);

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
  <div className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform">
    <div className="w-12 h-12 rounded-xl aurora-bg grid place-items-center"><Icon className="w-5 h-5 text-background" /></div>
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  </div>
);

export default Home;