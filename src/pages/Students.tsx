import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Upload, Trash2, Search, FilterX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Student = { id: string; name: string; usn: string; department: string; semester: string; division: string };

const Students = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterSem, setFilterSem] = useState("all");
  const [filterDiv, setFilterDiv] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", usn: "", department: "", semester: "", division: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("students").select("*").order("usn");
    setStudents((data as Student[]) ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("students").insert({ ...form, user_id: user!.id });
    if (error) return toast.error(error.message);
    toast.success("Student added");
    setForm({ name: "", usn: "", department: "", semester: "", division: "" });
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student? All their attendance records will also be deleted.")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Student deleted");
    load();
  };

  const onCsv = (file: File) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async ({ data }: any) => {
        const rows = (data as any[])
          .map(r => ({
            name: (r.name || r.Name || "").trim(),
            usn: (r.usn || r.USN || "").trim(),
            department: (r.department || r.Department || "").trim(),
            semester: String(r.semester || r.Semester || "").trim(),
            division: (r.division || r.Division || "").trim(),
            user_id: user!.id,
          }))
          .filter(r => r.name && r.usn && !/hod|signature|principal/i.test(r.name));
        if (!rows.length) return toast.error("No valid rows. Need columns: name, usn, department, semester, division.");
        const { error } = await supabase.from("students").upsert(rows, { onConflict: "user_id,usn" });
        if (error) return toast.error(error.message);
        toast.success(`Imported ${rows.length} students`);
        load();
      },
    });
  };

  const departments = Array.from(new Set(students.map(s => s.department)));
  const semesters = Array.from(new Set(students.map(s => s.semester))).sort();
  const divisions = Array.from(new Set(students.map(s => s.division))).sort();

  const filtered = students.filter(s => {
    const matchesQuery = [s.name, s.usn, s.department, s.division].some(v => v.toLowerCase().includes(q.toLowerCase()));
    const matchesDept = filterDept === "all" || s.department === filterDept;
    const matchesSem = filterSem === "all" || s.semester === filterSem;
    const matchesDiv = filterDiv === "all" || s.division === filterDiv;
    return matchesQuery && matchesDept && matchesSem && matchesDiv;
  });

  const resetFilters = () => {
    setQ("");
    setFilterDept("all");
    setFilterSem("all");
    setFilterDiv("all");
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} on roster</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={e => e.target.files?.[0] && onCsv(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-2" />CSV import</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="neu-fab text-background font-semibold"><Plus className="w-4 h-4 mr-2" />Add</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-0">
              <DialogHeader><DialogTitle>New student</DialogTitle></DialogHeader>
              <form onSubmit={add} className="space-y-3">
                {(["name","usn","department","semester","division"] as const).map(k => (
                  <div key={k}><Label className="capitalize">{k}</Label>
                    <Input required value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
                ))}
                <Button type="submit" className="w-full neu-fab text-background font-semibold">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4 mb-6 space-y-4">
        <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input className="border-0 bg-transparent focus-visible:ring-0 shadow-none h-9" placeholder="Search name, USN…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Department</Label>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue placeholder="Dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Semester</Label>
            <Select value={filterSem} onValueChange={setFilterSem}>
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue placeholder="Sem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Division</Label>
            <Select value={filterDiv} onValueChange={setFilterDiv}>
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue placeholder="Div" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map(d => <SelectItem key={d} value={d}>Div {d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={resetFilters} className="h-9 w-full rounded-xl text-muted-foreground hover:text-foreground">
              <FilterX className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        {filtered.map(s => (
          <div key={s.id} className="glass-card rounded-2xl p-4 flex items-center justify-between hover:scale-[1.005] transition-transform group">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl aurora-bg grid place-items-center text-background font-bold shrink-0">
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">{s.usn} • {s.department} • Sem {s.semester} • Div {s.division}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => del(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        {!filtered.length && (
          <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
            No students match your filters.
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Students;