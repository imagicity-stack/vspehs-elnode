"use client";

import { useEffect, useState } from "react";
import { useTeacher, ClassSwitcher } from "../teacher-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Avatar, Badge, EmptyState } from "@/components/ui";
import { fullName, todayISO } from "@/lib/utils";
import { AttendanceStatus } from "@/lib/types";
import { CheckCircle2, Clock, CircleSlash, Save, CalendarCheck } from "lucide-react";

const options: { key: AttendanceStatus; label: string; tone: string; icon: any }[] = [
  { key: "present", label: "Present", tone: "bg-emerald-500", icon: CheckCircle2 },
  { key: "late", label: "Late", tone: "bg-amber-500", icon: Clock },
  { key: "absent", label: "Absent", tone: "bg-rose-500", icon: CircleSlash },
];

export default function TeacherAttendance() {
  const { staff, activeClass } = useTeacher();
  const data = useData();
  const today = todayISO();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  const classStudents = activeClass ? data.students.filter((s) => s.classId === activeClass.id) : [];

  // preload existing marks for today
  useEffect(() => {
    if (!activeClass) return;
    const existing: Record<string, AttendanceStatus> = {};
    for (const s of classStudents) {
      const rec = data.attendance.find((a) => a.studentId === s.id && a.date === today);
      existing[s.id] = rec?.status ?? "present";
    }
    setMarks(existing);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass?.id]);

  if (!activeClass) return <EmptyState title="No class assigned." />;

  const set = (id: string, status: AttendanceStatus) => {
    setMarks((m) => ({ ...m, [id]: status }));
    setSaved(false);
  };
  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => (next[s.id] = status));
    setMarks(next);
    setSaved(false);
  };

  const save = () => {
    data.markAttendance(
      classStudents.map((s) => ({
        studentId: s.id, classId: activeClass.id, date: today, status: marks[s.id] ?? "present",
        lateBy: marks[s.id] === "late" ? 15 : undefined, markedBy: staff?.id ?? "s-anita",
      })),
    );
    setSaved(true);
  };

  const counts = {
    present: Object.values(marks).filter((m) => m === "present").length,
    late: Object.values(marks).filter((m) => m === "late").length,
    absent: Object.values(marks).filter((m) => m === "absent").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mark Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">{activeClass.name} · {new Date(today).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <ClassSwitcher />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex gap-2">
          <Badge tone="green"><CheckCircle2 className="h-3.5 w-3.5" /> {counts.present} present</Badge>
          <Badge tone="amber"><Clock className="h-3.5 w-3.5" /> {counts.late} late</Badge>
          <Badge tone="red"><CircleSlash className="h-3.5 w-3.5" /> {counts.absent} absent</Badge>
        </div>
        <div className="flex gap-2">
          <button onClick={() => markAll("present")} className="btn-ghost text-xs">Mark all present</button>
          <button onClick={save} className="btn-primary text-xs"><Save className="h-3.5 w-3.5" /> {saved ? "Saved ✓" : "Save"}</button>
        </div>
      </div>

      <Card>
        <CardHeader title="Students" subtitle={`${classStudents.length} children`} icon={<CalendarCheck className="h-5 w-5" />} />
        <div className="divide-y divide-slate-100">
          {classStudents.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={fullName(s)} src={s.photoUrl} size={40} />
                <div>
                  <p className="font-semibold text-slate-800">{fullName(s)}</p>
                  <p className="text-xs text-slate-400">Roll #{s.rollNo}{s.allergies.length ? ` · ⚠ ${s.allergies.join(", ")}` : ""}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {options.map((o) => {
                  const active = marks[s.id] === o.key;
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.key}
                      onClick={() => set(s.id, o.key)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? `${o.tone} border-transparent text-white` : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {saved && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✓ Attendance saved. Absent alerts have been sent to {counts.absent} parent{counts.absent === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}
