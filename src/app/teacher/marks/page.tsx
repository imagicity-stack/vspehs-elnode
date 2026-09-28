"use client";

// ─────────────────────────────────────────────────────────────
// Teacher → Marks Entry
// ─────────────────────────────────────────────────────────────
// Only papers this teacher is allocated appear here, and a sheet locks itself
// once submitted — an administrator has to reopen it before it can change.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData, type AuditActor } from "@/lib/store";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Avatar, Badge, EmptyState, Loading, Progress } from "@/components/ui";
import { formatDate, formatTime, fullName, todayISO } from "@/lib/utils";
import { ExamMarks, MarkEntry, MarkStatus, SubjectExam } from "@/lib/types";
import {
  MARK_STATUSES, MARK_STATUS_META, SHEET_STATUS_META, blankSheet, canMark, emptyEntry,
  isSheetLocked, sheetFor, sheetProgress, teacherScope,
} from "@/lib/exams";
import {
  Pencil, ArrowLeft, Save, Send, Lock, AlertTriangle, CheckCircle2, Clock, Search,
  CalendarDays, Info,
} from "lucide-react";

export default function TeacherMarks() {
  const { user } = useAuth();
  const data = useData();
  const [openExamId, setOpenExamId] = useState<string | null>(null);

  const me = data.staff.find((s) => s.id === user?.staffId);
  const scope = useMemo(
    () => teacherScope(me?.id ?? "", data.teacherAssignments),
    [me?.id, data.teacherAssignments],
  );

  // Every paper this teacher is allowed to mark, newest examination first.
  const myPapers = useMemo(() => {
    if (!me) return [];
    return data.subjectExams
      .filter((e) => canMark(e, me.id, scope))
      .filter((e) => {
        const group = data.examGroups.find((g) => g.id === e.groupId);
        return group && group.status !== "draft" && group.status !== "archived";
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [me, data.subjectExams, data.examGroups, scope]);

  const actor: AuditActor = {
    id: me?.id ?? user?.uid ?? "teacher",
    name: me?.name ?? user?.displayName ?? "Teacher",
    role: "teacher",
  };

  if (!me) {
    return (
      <EmptyState
        title="No staff profile linked to this login"
        hint="Ask an administrator to link your account from Admin → Staff."
      />
    );
  }

  const open = openExamId ? data.subjectExams.find((e) => e.id === openExamId) : undefined;
  if (open) {
    return <MarksSheet exam={open} actor={actor} onBack={() => setOpenExamId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Marks Entry</h1>
        <p className="mt-1 text-sm text-slate-500">
          Papers allocated to you. Submitted marks lock automatically.
        </p>
      </div>

      {data.loading && data.subjectExams.length === 0 ? (
        <Card><Loading label="Loading papers…" /></Card>
      ) : scope.pairs.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="No classes or subjects allocated to you yet"
            hint="An administrator assigns these from Admin → Teachers."
          />
        </Card>
      ) : myPapers.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Pencil className="h-8 w-8" />}
            title="No papers to mark"
            hint="Papers appear here once an administrator schedules an examination for your classes."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(
            myPapers.reduce<Record<string, SubjectExam[]>>((acc, p) => {
              (acc[p.groupId] ??= []).push(p);
              return acc;
            }, {}),
          ).map(([groupId, list]) => {
            const group = data.examGroups.find((g) => g.id === groupId);
            return (
              <Card key={groupId}>
                <CardHeader
                  title={group?.name ?? "Examination"}
                  subtitle={`${group?.sessionName ?? ""} · ${list.length} paper${list.length === 1 ? "" : "s"} allocated to you`}
                  icon={<CalendarDays className="h-5 w-5" />}
                />
                <div className="divide-y divide-slate-50">
                  {list.map((p) => {
                    const cls = data.classes.find((c) => c.id === p.classId);
                    const subject = data.subjects.find((s) => s.id === p.subjectId);
                    const students = data.students.filter((s) => s.classId === p.classId && s.status === "active");
                    const sheet = sheetFor(p.id, data.examMarks);
                    const prog = sheetProgress(sheet, students.length);
                    const meta = SHEET_STATUS_META[prog.status];
                    const overdue = p.marksDeadline && p.marksDeadline < todayISO() && !isSheetLocked(sheet);
                    return (
                      <button
                        key={p.id}
                        onClick={() => setOpenExamId(p.id)}
                        className="flex w-full flex-col gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {subject?.name ?? p.subjectId} <span className="font-normal text-slate-400">· {cls?.name}</span>
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {formatDate(p.date)} · {formatTime(p.startTime)} · {p.maxMarks} marks (pass {p.passingMarks})
                            {p.marksDeadline ? ` · due ${formatDate(p.marksDeadline)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {overdue && <Badge tone="red">Overdue</Badge>}
                          <span className="text-sm font-semibold text-slate-600">{prog.entered}/{prog.total}</span>
                          <div className="w-20"><Progress value={prog.percent} tone={prog.complete ? "green" : prog.percent ? "amber" : "slate"} /></div>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {isSheetLocked(sheet) && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// The sheet itself
// ─────────────────────────────────────────────────────────────
function MarksSheet({
  exam, actor, onBack,
}: { exam: SubjectExam; actor: AuditActor; onBack: () => void }) {
  const data = useData();
  const cls = data.classes.find((c) => c.id === exam.classId);
  const subject = data.subjects.find((s) => s.id === exam.subjectId);
  const group = data.examGroups.find((g) => g.id === exam.groupId);

  const students = useMemo(
    () => data.students
      .filter((s) => s.classId === exam.classId && s.status === "active")
      .sort((a, b) => a.rollNo - b.rollNo),
    [data.students, exam.classId],
  );

  const stored = sheetFor(exam.id, data.examMarks);
  const locked = isSheetLocked(stored);
  const [entries, setEntries] = useState<Record<string, MarkEntry>>(() => stored?.entries ?? {});
  const [q, setQ] = useState("");
  const [dirty, setDirty] = useState(false);

  // Pick up a reopen or another device's save while this screen is open, but
  // never clobber marks being typed right now.
  const storedKey = stored ? `${stored.status}|${stored.updatedAt}` : "none";
  useEffect(() => {
    if (!dirty) setEntries(stored?.entries ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedKey]);

  const entryOf = (studentId: string): MarkEntry => entries[studentId] ?? emptyEntry();

  const setEntry = (studentId: string, patch: Partial<MarkEntry>) => {
    if (locked) return;
    setEntries((e) => ({ ...e, [studentId]: { ...entryOf(studentId), ...patch } }));
    setDirty(true);
  };

  const setStatus = (studentId: string, status: MarkStatus) =>
    // A non-numeric status can't carry a mark, so clear it as the status changes.
    setEntry(studentId, { status, marks: MARK_STATUS_META[status].numeric ? entryOf(studentId).marks : null });

  const setMarks = (studentId: string, raw: string) => {
    if (raw === "") return setEntry(studentId, { marks: null });
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setEntry(studentId, { marks: n, status: "present" });
  };

  const invalid = students.filter((s) => {
    const e = entries[s.id];
    return typeof e?.marks === "number" && (e.marks > exam.maxMarks || e.marks < 0);
  });
  const missing = students.filter((s) => {
    const e = entries[s.id];
    return !e || (MARK_STATUS_META[e.status].numeric && e.marks === null);
  });

  const build = (): ExamMarks => ({ ...(stored ?? blankSheet(exam)), entries, status: stored?.status ?? "draft" });

  const saveDraft = () => {
    if (invalid.length > 0) {
      toast.error(`${invalid.length} mark${invalid.length === 1 ? " is" : "s are"} outside 0–${exam.maxMarks}.`);
      return;
    }
    data.saveMarks({ ...build(), status: "draft" }, actor);
    setDirty(false);
    toast.success("Draft saved. Parents can't see draft marks.");
  };

  const submit = () => {
    if (invalid.length > 0) {
      toast.error(`Fix ${invalid.length} out-of-range mark${invalid.length === 1 ? "" : "s"} first.`);
      return;
    }
    if (missing.length > 0) {
      toast.error(`${missing.length} student${missing.length === 1 ? " has" : "s have"} no mark or status yet.`);
      return;
    }
    if (!confirm(
      `Submit ${subject?.name} marks for ${cls?.name}?\n\nThe sheet locks once submitted — an administrator has to reopen it to make changes.`,
    )) return;
    data.submitMarks(build(), actor);
    setDirty(false);
    toast.success("Marks submitted and locked.");
  };

  const filtered = students.filter(
    (s) => !q || fullName(s).toLowerCase().includes(q.toLowerCase()) || String(s.rollNo).includes(q),
  );
  const prog = sheetProgress({ ...blankSheet(exam), entries }, students.length);
  const meta = SHEET_STATUS_META[stored?.status ?? "not-started"];

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> All papers
        </button>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{subject?.name}</h1>
              <Badge tone="brand">{cls?.name}</Badge>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {group?.name} · {formatDate(exam.date)} · maximum {exam.maxMarks} · passing {exam.passingMarks}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find student…" className="input pl-9 sm:w-52" />
          </div>
        </div>
      </div>

      {locked ? (
        <div className="flex items-start gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            These marks were submitted{stored?.submittedAt ? ` on ${formatDate(stored.submittedAt)}` : ""} and are
            locked. Ask an administrator to reopen the sheet if something needs correcting.
          </span>
        </div>
      ) : (
        <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">{prog.entered}/{students.length} entered</span>
            <div className="w-28"><Progress value={prog.percent} tone={prog.complete ? "green" : "amber"} /></div>
            {invalid.length > 0 && (
              <Badge tone="red"><AlertTriangle className="h-3 w-3" /> {invalid.length} out of range</Badge>
            )}
            {dirty && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={saveDraft} className="btn-ghost text-xs"><Save className="h-3.5 w-3.5" /> Save draft</button>
            <button onClick={submit} disabled={invalid.length > 0} className="btn-primary text-xs">
              <Send className="h-3.5 w-3.5" /> Submit marks
            </button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader
          title="Students"
          subtitle={`${students.length} in ${cls?.name}`}
          icon={<Pencil className="h-5 w-5" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Roll</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Student</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Marks</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Remarks</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((s) => {
                const e = entryOf(s.id);
                const statusMeta = MARK_STATUS_META[e.status];
                const over = typeof e.marks === "number" && (e.marks > exam.maxMarks || e.marks < 0);
                const passed = typeof e.marks === "number" && e.marks >= exam.passingMarks;
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500">{s.rollNo}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(s)} src={s.photoUrl} size={30} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{fullName(s)}</p>
                          <p className="truncate text-xs text-slate-400">{s.admissionNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {statusMeta.numeric ? (
                        <input
                          type="number"
                          min={0}
                          max={exam.maxMarks}
                          value={e.marks ?? ""}
                          disabled={locked}
                          onChange={(ev) => setMarks(s.id, ev.target.value)}
                          className={`input w-24 px-2 py-1.5 text-sm ${over ? "border-rose-400 focus:ring-rose-200" : ""} disabled:bg-slate-50`}
                          placeholder="—"
                          aria-label={`${fullName(s)} marks`}
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">{statusMeta.short}</span>
                      )}
                      {over && <p className="mt-0.5 text-[11px] text-rose-600">0–{exam.maxMarks} only</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={e.status}
                        disabled={locked}
                        onChange={(ev) => setStatus(s.id, ev.target.value as MarkStatus)}
                        className="input w-36 px-2 py-1.5 text-sm disabled:bg-slate-50"
                        aria-label={`${fullName(s)} status`}
                      >
                        {MARK_STATUSES.map((st) => (
                          <option key={st} value={st}>{MARK_STATUS_META[st].label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        value={e.remarks ?? ""}
                        disabled={locked}
                        onChange={(ev) => setEntry(s.id, { remarks: ev.target.value })}
                        placeholder="Optional"
                        className="input w-40 px-2 py-1.5 text-sm disabled:bg-slate-50"
                        aria-label={`${fullName(s)} remarks`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      {!statusMeta.numeric ? (
                        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      ) : e.marks === null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <Badge tone={passed ? "green" : "red"}>{passed ? "Pass" : "Fail"}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-6"><EmptyState title={students.length ? "No students match" : "No active students in this class"} /></div>
        )}
      </Card>

      {!locked && (
        <p className="flex items-start gap-1.5 text-xs text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Absent and Not appeared count as zero towards the total. Medical leave and Exempted are left
          out of the total altogether, so they don&apos;t drag the percentage down.
        </p>
      )}

      {exam.marksDeadline && !locked && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" /> Marks entry closes {formatDate(exam.marksDeadline)}.
        </p>
      )}

      {locked && stored?.status === "verified" && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Verified by the examination office.
        </p>
      )}
    </div>
  );
}
