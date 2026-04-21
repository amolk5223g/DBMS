import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, FileSpreadsheet, Download, Trash2, FilterX, Clock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

type Row = {
  id: string; status: "present" | "absent"; marked_at: string; created_at: string;
  subject_name: string; department: string; semester: string; division: string;
  students: { name: string; usn: string } | null;
};

const Logs = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterSem, setFilterSem] = useState("all");
  const [filterDiv, setFilterDiv] = useState("all");

  const load = async () => {
    let q = supabase.from("attendance")
      .select("id,status,marked_at,created_at,subject_name,department,semester,division,students(name,usn)")
      .order("created_at", { ascending: false });
    
    if (date) q = q.eq("marked_at", date);
    if (subject) q = q.ilike("subject_name", `%${subject}%`);
    if (filterDept !== "all") q = q.eq("department", filterDept);
    if (filterSem !== "all") q = q.eq("semester", filterSem);
    if (filterDiv !== "all") q = q.eq("division", filterDiv);
    
    const { data } = await q;
    setRows((data as any as Row[]) ?? []);
  };
  
  useEffect(() => { if (user) load(); }, [user, date, subject, filterDept, filterSem, filterDiv]);

  const toggle = async (r: Row) => {
    const next = r.status === "present" ? "absent" : "present";
    const { error } = await supabase.from("attendance").update({ status: next }).eq("id", r.id);
    if (error) return toast.error(error.message);
    setRows(rs => rs.map(x => x.id === r.id ? { ...x, status: next } : x));
  };

  const del = async (id: string) => {
    if (!confirm("Delete this record permanently?")) return;
    const { error } = await supabase.from("attendance").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Record deleted");
    setRows(rs => rs.filter(x => x.id !== id));
  };

  const exportPDF = () => {
    if (!rows.length) return toast.error("No data to export");
    const doc = new jsPDF();
    doc.text(`Attendance Report - ${date || "All Dates"}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const tableData = rows.map(r => [
      r.students?.name || "N/A",
      r.students?.usn || "N/A",
      r.subject_name,
      `${r.marked_at} ${format(new Date(r.created_at), "HH:mm")}`,
      r.status.toUpperCase(),
      `${r.department} - Sem ${r.semester}(${r.division})`
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["Student Name", "USN", "Subject", "Date & Time", "Status", "Class"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`attendance_report_${date || "all"}.pdf`);
  };

  const exportExcel = () => {
    if (!rows.length) return toast.error("No data to export");
    const data = rows.map(r => ({
      "Student Name": r.students?.name || "N/A",
      "USN": r.students?.usn || "N/A",
      "Subject": r.subject_name,
      "Date": r.marked_at,
      "Time": format(new Date(r.created_at), "HH:mm:ss"),
      "Status": r.status.toUpperCase(),
      "Department": r.department,
      "Semester": r.semester,
      "Division": r.division
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Logs");
    XLSX.writeFile(wb, `attendance_report_${date || "all"}.xlsx`);
  };

  const departments = Array.from(new Set(rows.map(r => r.department)));
  const semesters = Array.from(new Set(rows.map(r => r.semester))).sort();
  const divisions = Array.from(new Set(rows.map(r => r.division))).sort();

  const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
    const k = `${r.subject_name} — ${r.marked_at}`;
    (acc[k] ||= []).push(r); return acc;
  }, {});

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Attendance logs</h1>
          <p className="text-sm text-muted-foreground">Manage and export attendance records.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="h-10">
            <FileText className="w-4 h-4 mr-2 text-primary" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-10">
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4 mb-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><Label>Subject contains</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Data" /></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
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
          <div>
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
          <div>
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
            <Button variant="ghost" onClick={() => { setDate(""); setSubject(""); setFilterDept("all"); setFilterSem("all"); setFilterDiv("all"); }} className="h-9 w-full rounded-xl text-muted-foreground">
              <FilterX className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">No records found.</div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([key, items]) => {
          const p = items.filter(i => i.status === "present").length;
          return (
            <div key={key} className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between bg-primary/5">
                <div className="font-semibold">{key}</div>
                <Badge variant="outline" className="border-primary/40 text-primary bg-background">
                  {p}/{items.length} present
                </Badge>
              </div>
              <div className="divide-y divide-border/30">
                {items.map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3 group">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="hidden sm:flex flex-col items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                        <Clock className="w-3 h-3 mb-0.5" />
                        {format(new Date(r.created_at), "HH:mm")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.students?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.students?.usn}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === "present" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {r.status.toUpperCase()}
                      </span>
                      <Switch checked={r.status === "present"} onCheckedChange={() => toggle(r)} />
                      <Button variant="ghost" size="icon" onClick={() => del(r.id)} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
};

export default Logs;