"use client";

// ─────────────────────────────────────────────────────────────
// Teacher → My Classes
// ─────────────────────────────────────────────────────────────
// The classes and subjects allocated to this teacher, and the roster behind
// each one. Student master data is read-only here.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { Card, CardHeader, Avatar, Badge, EmptyState, Loading, Table, Th, Td } from "@/components/ui";
import { fullName, formatDate } from "@/lib/utils";
import { studentAttendanceRate } from "@/lib/analytics";
import { sheetFor, teacherScope } from "@/lib/exams";
import {
  Users, School, ArrowLeft, BookOpen, AlertTriangle, Search, ShieldCheck, Phone,
} from "lucide-react";

export default function TeacherClasses() {
  const { user } = useAuth();
  const data = useData();
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const me = data.staff.find((s) => s.id === user?.staffId);
  const scope = useMemo(
    () => teacherScope(me?.id ?? "", data.teacherAssignments),
    [me?.id, data.teacherAssignments],
  );

  if (!me) {
    return (
      <EmptyState
        title="No staff profile linked to this login"
        hint="Ask an administrator to link your account from Admin → Staff."
      />
    );
  }

  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? id;

  // ── One class's roster ──
  if (openClassId) {
    const cls = data.classes.find((c) => c.id === openClassId);
    const students = data.students
      .filter((s) => s.classId === openClassId && s.status === "active")
      .filter((s) => !q || fullName(s).toLowerCase().includes(q.toLowerCase()) || s.admissionNo.includes(q))
      .sort((a, b) => a.rollNo - b.rollNo);
    const mySubjects = scope.pairs.filter((p) => p.classId === openClassId).map((p) => p.subjectId);

    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => { setOpenClassId(null); setQ(""); }} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
            <ArrowLeft className="h-4 w-4" /> My classes
          </button>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{cls?.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                {students.length} students · you teach
                {mySubjects.map((id) => <Badge key={id} tone="brand">{subjectName(id)}</Badge>)}
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find student…" className="input pl-9 sm:w-56" />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader title="Students" subtitle="View only" icon={<Users className="h-5 w-5" />} />
          {students.length === 0 ? (
            <div className="p-8"><EmptyState title="No students match" /></div>
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Roll</Th><Th>Student</Th><Th>Admission</Th><Th>Parent</Th>
                  <Th>Attendance</Th><Th>Examination</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((s) => {
                  const att = studentAttendanceRate(data.attendance, s.id);
                  // Which of this teacher's papers already carry a mark for them.
                  const myPapers = data.subjectExams.filter(
                    (e) => e.classId === openClassId && mySubjects.includes(e.subjectId),
                  );
                  const marked = myPapers.filter((e) => {
                    const entry = sheetFor(e.id, data.examMarks)?.entries[s.id];
                    return entry && (entry.marks !== null || entry.status !== "present");
                  }).length;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <Td>{s.rollNo}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={fullName(s)} src={s.photoUrl} size={32} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{fullName(s)}</p>
                            {s.allergies.length > 0 && (
                              <p className="truncate text-[11px] text-amber-600">⚠ {s.allergies.join(", ")}</p>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>{s.admissionNo}</Td>
                      <Td>
                        <p className="text-sm text-slate-700">{s.fatherName || s.motherName || "—"}</p>
                        {s.primaryContact && (
                          <a href={`tel:${s.primaryContact}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600">
                            <Phone className="h-3 w-3" /> {s.primaryContact}
                          </a>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={att.rate >= 90 ? "green" : att.rate >= 75 ? "amber" : "red"}>
                          {att.total ? `${att.rate}%` : "—"}
                        </Badge>
                      </Td>
                      <Td>
                        {myPapers.length === 0
                          ? <span className="text-slate-300">No papers</span>
                          : <span className="text-sm text-slate-600">{marked}/{myPapers.length} marked</span>}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    );
  }

  // ── Class cards ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Classes</h1>
        <p className="mt-1 text-sm text-slate-500">Classes and subjects allocated to you.</p>
      </div>

      {data.loading && data.classes.length === 0 ? (
        <Card><Loading label="Loading classes…" /></Card>
      ) : scope.classIds.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="No classes allocated to you yet"
            hint="An administrator assigns classes and subjects from Admin → Teachers."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scope.classIds.map((classId) => {
            const cls = data.classes.find((c) => c.id === classId);
            if (!cls) return null;
            const students = data.students.filter((s) => s.classId === classId && s.status === "active");
            const subjects = scope.pairs.filter((p) => p.classId === classId);
            const isClassTeacher = cls.classTeacherId === me.id;
            return (
              <button
                key={classId}
                onClick={() => setOpenClassId(classId)}
                className="card p-5 text-left transition hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">
                    {cls.name.charAt(0)}
                  </div>
                  {isClassTeacher && <Badge tone="violet"><ShieldCheck className="h-3 w-3" /> Class teacher</Badge>}
                </div>
                <p className="mt-3 font-bold text-slate-900">{cls.name}</p>
                <p className="text-sm text-slate-500">{students.length} students · {cls.room}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {subjects.map((p) => (
                    <Badge key={p.subjectId} tone="brand"><BookOpen className="h-3 w-3" /> {subjectName(p.subjectId)}</Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {scope.classIds.length > 0 && (
        <Card>
          <CardHeader title="Allocation summary" icon={<School className="h-5 w-5" />} />
          <div className="p-5 text-sm text-slate-600">
            You teach <strong>{scope.pairs.length}</strong> class-subject
            combination{scope.pairs.length === 1 ? "" : "s"} across{" "}
            <strong>{scope.classIds.length}</strong> class{scope.classIds.length === 1 ? "" : "es"}
            {data.classes.some((c) => c.classTeacherId === me.id) && (
              <> and are class teacher of{" "}
                <strong>{data.classes.filter((c) => c.classTeacherId === me.id).map((c) => c.name).join(", ")}</strong></>
            )}
            . Joined {me.joiningDate ? formatDate(me.joiningDate) : "—"}.
          </div>
        </Card>
      )}
    </div>
  );
}
