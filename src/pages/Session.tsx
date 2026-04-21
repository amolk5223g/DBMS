import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, ChevronLeft, PartyPopper } from "lucide-react";

type Student = { id: string; name: string; usn: string };

const Session = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const subject = params.get("subject") ?? "";
  const department = params.get("department") ?? "";
  const semester = params.get("semester") ?? "";
  const division = params.get("division") ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!user) return;
    supabase.from("students").select("id,name,usn")
      .eq("department", department).eq("semester", semester).eq("division", division)
      .order("usn").then(({ data }) => setStudents((data as Student[]) ?? []));
  }, [user, department, semester, division]);

  const current = students[idx];

  const mark = async (status: "present" | "absent") => {
    if (!current) return;
    const { error } = await supabase.from("attendance").upsert({
      user_id: user!.id, student_id: current.id, subject_name: subject,
      department, semester, division, status, marked_at: today,
    }, { onConflict: "student_id,subject_name,marked_at" });
    if (error) return toast.error(error.message);
    setMarks(m => ({ ...m, [current.id]: status }));
    if (idx + 1 >= students.length) {
      setDone(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } else {
      setIdx(i => i + 1);
    }
  };

  const previous = async () => {
    if (idx === 0) return;
    const prev = students[idx - 1];
    await supabase.from("attendance").delete()
      .eq("student_id", prev.id).eq("subject_name", subject).eq("marked_at", today);
    setMarks(m => { const n = { ...m }; delete n[prev.id]; return n; });
    setIdx(i => i - 1);
    setDone(false);
  };

  if (!subject) return <AppShell><p>Missing subject. <Link to="/" className="text-primary underline">Go back</Link></p></AppShell>;

  const presentCount = Object.values(marks).filter(s => s === "present").length;
  const absentCount = Object.values(marks).filter(s => s === "absent").length;

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <div className="glass-panel rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Subject</div>
            <div className="font-bold text-lg">{subject}</div>
            <div className="text-xs text-muted-foreground">{department} • Sem {semester} • Div {division}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{Math.min(idx + (done ? 0 : 1), students.length)}/{students.length}</div>
            <div className="text-xs text-muted-foreground">P {presentCount} · A {absentCount}</div>
          </div>
        </div>

        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mb-6">
          <div className="h-full aurora-bg transition-all" style={{ width: `${students.length ? ((idx + (done ? 1 : 0)) / students.length) * 100 : 0}%` }} />
        </div>

        <div className="perspective-scene relative h-[360px] mb-8">
          <AnimatePresence mode="popLayout">
            {done ? (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-3xl p-8 text-center absolute inset-0 flex flex-col items-center justify-center">
                <PartyPopper className="w-12 h-12 text-primary mb-3" />
                <h2 className="text-2xl font-bold">Session complete</h2>
                <p className="text-muted-foreground mt-1">{presentCount} present · {absentCount} absent</p>
                <div className="flex gap-2 mt-6">
                  <Button onClick={() => navigate("/logs")} className="neu-fab text-background font-semibold">View logs</Button>
                  <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
                </div>
              </motion.div>
            ) : current ? (
              <motion.div key={current.id}
                initial={{ opacity: 0, rotateY: -25, z: -200 }}
                animate={{ opacity: 1, rotateY: 0, z: 0 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.25 } }}
                whileHover={{ rotateY: 4, rotateX: -4 }}
                transition={{ type: "spring", stiffness: 200, damping: 22 }}
                className="glass-card rounded-3xl p-8 absolute inset-0 flex flex-col items-center justify-center text-center"
                style={{ transformStyle: "preserve-3d" }}>
                <div className="w-20 h-20 rounded-2xl aurora-bg grid place-items-center text-3xl font-bold text-background mb-4 shadow-2xl">
                  {current.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{current.usn}</div>
                <h2 className="text-3xl font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{current.name}</h2>
              </motion.div>
            ) : (
              <div className="glass-card rounded-3xl p-8 absolute inset-0 grid place-items-center text-muted-foreground">No students in this class.</div>
            )}
          </AnimatePresence>
        </div>

        {!done && current && (
          <div className="grid grid-cols-[auto_1fr_1fr] gap-3">
            <Button variant="outline" onClick={previous} disabled={idx === 0} className="h-16 rounded-2xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button onClick={() => mark("absent")} variant="outline"
              className="h-16 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold">
              <X className="w-5 h-5 mr-2" /> Absent
            </Button>
            <Button onClick={() => mark("present")}
              className="h-16 rounded-2xl neu-fab text-background font-bold">
              <Check className="w-5 h-5 mr-2" /> Present
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Session;