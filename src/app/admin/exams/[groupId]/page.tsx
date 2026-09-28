"use client";

// ─────────────────────────────────────────────────────────────
// Admin → Examinations → one exam group
// ─────────────────────────────────────────────────────────────
// Everything that happens inside one examination: its subject papers, the
// generated timetable, how far marks entry has got, and the verification and
// publishing of results class by class.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useData, type AuditActor } from "@/lib/store";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Badge, Avatar, EmptyState, Loading, Progress, Table, Th, Td } from "@/components/ui";
import { MarksSheet } from "@/components/MarksSheet";
import { formatDate, formatTime, fullName, todayISO } from "@/lib/utils";
import { studentAttendanceRate } from "@/lib/analytics";
import { ExamGroup, SubjectExam } from "@/lib/types";
import {
  GROUP_STATUS_META, SHEET_STATUS_META, assignRanks, computeStudentResult, hasBlockingIssues,
  scaleForExam, sheetFor, sheetProgress, subjectsForClass, validateClassForPublish,
} from "@/lib/exams";
import {
  ArrowLeft, CalendarDays, ClipboardList, Plus, X, Pencil, Trash2, CheckCircle2, AlertTriangle,
  Send, Unlock, ShieldCheck, Clock, FileCheck2, Users, Eye, Loader2, Info,
} from "lucide-react";

const uid = () => `se-${Math.random().toString(36).slice(2, 9)}`;

export default function ExamGroupPage({ params }: { params: { groupId: string } }) {
  const { user } = useAuth();
  const data = useData();
  const [tab, setTab] = useState<"papers" | "timetable" | "marks" | "results">("papers");

  const actor: AuditActor = {
    id: user?.staffId ?? user?.uid ?? "admin",
    name: user?.displayName ?? "Super Admin",
    role: user?.role ?? "superadmin",
  };

  const group = data.examGroups.find((g) => g.id === params.groupId);
  const papers = useMemo(
    () => data.subjectExams.filter((e) => e.groupId === params.groupId),
    [data.subjectExams, params.groupId],
  );

  if (data.loading && !group) return <Card><Loading label="Loading examination…" /></Card>;
  if (!group) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="Examination not found"
          hint="It may have been deleted."
        />
        <div className="mt-4 flex justify-center">
          <Link href="/admin/exams" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Back to examinations</Link>
        </div>
      </Card>
    );
  }

  const meta = GROUP_STATUS_META[group.status];
  const submitted = papers.filter((p) => {
    const s = sheetFor(p.id, data.examMarks);
    return s?.status === "submitted" || s?.status === "verified" || s?.status === "published";
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/exams" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Examinations
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{group.name}</h1>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {group.sessionName} · {formatDate(group.startDate)} → {formatDate(group.endDate)} ·{" "}
              {group.classIds.length} class{group.classIds.length === 1 ? "" : "es"} ·{" "}
              {submitted}/{papers.length} papers marked
            </p>
          </div>
          <StatusPicker group={group} actor={actor} />
        </div>
      </div>

      <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-card">
        {([
          ["papers", "Papers", ClipboardList],
          ["timetable", "Timetable", CalendarDays],
          ["marks", "Marks entry", Pencil],
          ["results", "Results", Send],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === key ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "papers" && <PapersTab group={group} papers={papers} actor={actor} />}
      {tab === "timetable" && <TimetableTab group={group} papers={papers} />}
      {tab === "marks" && <MarksTab group={group} papers={papers} actor={actor} />}
      {tab === "results" && <ResultsTab group={group} papers={papers} actor={actor} />}
    </div>
  );
}

// ── Status workflow ───────────────────────────────────────────
function StatusPicker({ group, actor }: { group: ExamGroup; actor: AuditActor }) {
  const data = useData();

  const change = (status: ExamGroup["status"]) => {
    data.setExamGroupStatus(group.id, status, actor);

    // Two transitions are worth telling people about.
    if (status === "scheduled") {
      data.pushNotification({
        audience: "parents",
        classIds: group.classIds,
        title: `${group.name} schedule published`,
        body: `The timetable for ${group.name} is now available, ${formatDate(group.startDate)} to ${formatDate(group.endDate)}.`,
        category: "exam",
        link: "/parent/exams",
      });
    }
    if (status === "marks-entry") {
      // Address it to the teachers who actually have papers in this exam.
      const staffIds = Array.from(new Set(
        data.subjectExams
          .filter((e) => e.groupId === group.id)
          .flatMap((e) => e.evaluatorId
            ? [e.evaluatorId]
            : data.teacherAssignments
                .filter((a) => a.classId === e.classId && a.subjectId === e.subjectId)
                .map((a) => a.teacherId)),
      ));
      data.pushNotification({
        audience: "teachers",
        staffIds,
        title: `Marks entry open for ${group.name}`,
        body: group.resultDate
          ? `Enter and submit your marks before ${formatDate(group.resultDate)}.`
          : "Enter and submit the marks for your allocated papers.",
        category: "marks",
        link: "/teacher/marks",
      });
    }

    toast.success(`Status set to ${GROUP_STATUS_META[status].label}.`);
  };

  return (
    <select
      value={group.status}
      onChange={(e) => change(e.target.value as ExamGroup["status"])}
      className="input sm:w-48"
    >
      {Object.entries(GROUP_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────
// Papers
// ─────────────────────────────────────────────────────────────
function PapersTab({
  group, papers, actor,
}: { group: ExamGroup; papers: SubjectExam[]; actor: AuditActor }) {
  const data = useData();
  const [addFor, setAddFor] = useState<string | null>(null);
  const [edit, setEdit] = useState<SubjectExam | null>(null);

  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? id;
  const teacherName = (id?: string) => data.staff.find((s) => s.id === id)?.name;

  return (
    <div className="space-y-6">
      {group.classIds.length === 0 && (
        <Card className="p-8">
          <EmptyState title="No classes on this examination" hint="Edit the examination to choose which classes sit it." />
        </Card>
      )}

      {group.classIds.map((classId) => {
        const cls = data.classes.find((c) => c.id === classId);
        const classPapers = papers
          .filter((p) => p.classId === classId)
          .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
        return (
          <Card key={classId}>
            <CardHeader
              title={cls?.name ?? "Unknown class"}
              subtitle={`${classPapers.length} paper${classPapers.length === 1 ? "" : "s"}`}
              icon={<ClipboardList className="h-5 w-5" />}
              action={
                <button onClick={() => setAddFor(classId)} className="btn-ghost px-3 py-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add papers
                </button>
              }
            />
            {classPapers.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No subject papers yet"
                  hint="Add the subjects this class will be examined in."
                />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Subject</Th><Th>Date</Th><Th>Time</Th><Th>Marks</Th><Th>Evaluator</Th><Th>Status</Th><Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {classPapers.map((p) => {
                    const sheet = sheetFor(p.id, data.examMarks);
                    const s = SHEET_STATUS_META[sheet?.status ?? "not-started"];
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <Td><span className="font-medium text-slate-800">{subjectName(p.subjectId)}</span></Td>
                        <Td>{formatDate(p.date)}</Td>
                        <Td>{formatTime(p.startTime)} · {p.durationMins} min</Td>
                        <Td>{p.maxMarks} <span className="text-slate-400">(pass {p.passingMarks})</span></Td>
                        <Td>{teacherName(p.evaluatorId) ?? <span className="text-slate-300">Assigned teacher</span>}</Td>
                        <Td><Badge tone={s.tone}>{s.label}</Badge></Td>
                        <Td>
                          <div className="flex gap-1">
                            <button onClick={() => setEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" title="Edit paper">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (!confirm(`Delete ${subjectName(p.subjectId)} for ${cls?.name}? Any marks entered are removed too.`)) return;
                                data.deleteSubjectExam(p.id, actor);
                                toast.success("Paper removed.");
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Delete paper"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        );
      })}

      {addFor && (
        <AddPapersModal
          group={group}
          classId={addFor}
          existing={papers.filter((p) => p.classId === addFor)}
          actor={actor}
          onClose={() => setAddFor(null)}
        />
      )}
      {edit && <EditPaperModal group={group} exam={edit} actor={actor} onClose={() => setEdit(null)} />}
    </div>
  );
}

function AddPapersModal({
  group, classId, existing, actor, onClose,
}: {
  group: ExamGroup; classId: string; existing: SubjectExam[]; actor: AuditActor; onClose: () => void;
}) {
  const data = useData();
  const cls = data.classes.find((c) => c.id === classId);
  const taken = new Set(existing.map((e) => e.subjectId));

  // Subjects this class actually offers come from who is assigned to teach it;
  // the full list stays available for anything not yet allocated.
  const allocated = subjectsForClass(classId, data.teacherAssignments, data.subjects);
  const allocatedIds = new Set(allocated.map((s) => s.id));
  const available = data.subjects.filter((s) => !taken.has(s.id));

  const [picked, setPicked] = useState<string[]>(
    allocated.filter((s) => !taken.has(s.id)).map((s) => s.id),
  );
  const [startDate, setStartDate] = useState(group.startDate);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = () => {
    if (picked.length === 0) return;
    // Space the papers one day apart from the chosen start, which is how a
    // timetable is normally laid out; each is editable afterwards.
    const exams: SubjectExam[] = picked.map((subjectId, i) => {
      const d = new Date(`${startDate}T00:00:00`);
      d.setDate(d.getDate() + i);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      // Prefer whoever is assigned to teach this subject in this class.
      const evaluator = data.teacherAssignments.find(
        (a) => a.classId === classId && a.subjectId === subjectId,
      )?.teacherId;
      return {
        id: uid(),
        groupId: group.id,
        classId,
        subjectId,
        date: date > group.endDate ? group.endDate : date,
        startTime: group.defaultStartTime,
        durationMins: group.defaultDurationMins,
        maxMarks: group.defaultMaxMarks,
        passingMarks: group.defaultPassingMarks,
        gradeScaleId: group.gradeScaleId,
        evaluatorId: evaluator,
        marksDeadline: group.resultDate,
        component: "theory",
        createdAt: new Date().toISOString(),
      };
    });
    data.saveSubjectExams(exams, actor);
    toast.success(`${exams.length} paper${exams.length === 1 ? "" : "s"} added for ${cls?.name}.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Add papers · {cls?.name}</h3>
            <p className="text-sm text-slate-500">{group.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div>
            <label className="label">First paper on</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
            <p className="mt-1 text-xs text-slate-400">Papers are spaced a day apart from here; adjust any of them afterwards.</p>
          </div>

          <div>
            <label className="label">Subjects</label>
            {available.length === 0 ? (
              <p className="text-sm text-slate-400">Every subject already has a paper for this class.</p>
            ) : (
              <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                {available.map((s) => {
                  const on = picked.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition ${
                        on ? "border-brand-400 bg-brand-50" : "border-transparent hover:bg-white"
                      }`}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="h-3.5 w-3.5 accent-brand-600" />
                      <span className="flex-1 font-medium text-slate-700">{s.name}</span>
                      {allocatedIds.has(s.id)
                        ? <Badge tone="green">allocated</Badge>
                        : <span className="text-[11px] text-slate-400">no teacher</span>}
                    </label>
                  );
                })}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-400">
              Subjects marked <span className="font-semibold text-emerald-600">allocated</span> have a teacher
              assigned to this class and are pre-selected.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Each paper starts with the examination defaults: {formatTime(group.defaultStartTime)},{" "}
            {group.defaultDurationMins} min, {group.defaultMaxMarks} marks (pass {group.defaultPassingMarks}).
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={create} disabled={picked.length === 0} className="btn-primary flex-1 py-2.5">
            <Plus className="h-4 w-4" /> Add {picked.length || ""} paper{picked.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPaperModal({
  group, exam, actor, onClose,
}: { group: ExamGroup; exam: SubjectExam; actor: AuditActor; onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState({
    date: exam.date,
    startTime: exam.startTime,
    durationMins: String(exam.durationMins),
    maxMarks: String(exam.maxMarks),
    passingMarks: String(exam.passingMarks),
    gradeScaleId: exam.gradeScaleId ?? "",
    room: exam.room ?? "",
    evaluatorId: exam.evaluatorId ?? "",
    syllabus: exam.syllabus ?? "",
    instructions: exam.instructions ?? "",
    marksDeadline: exam.marksDeadline ?? "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const marksValid = Number(form.passingMarks) <= Number(form.maxMarks);
  // Teachers assigned this subject in this class are the natural evaluators.
  const candidates = data.staff.filter((s) =>
    data.teacherAssignments.some(
      (a) => a.teacherId === s.id && a.classId === exam.classId && a.subjectId === exam.subjectId,
    ),
  );

  const save = () => {
    if (!marksValid) return;
    data.saveSubjectExams([{
      ...exam,
      date: form.date,
      startTime: form.startTime,
      durationMins: Number(form.durationMins) || exam.durationMins,
      maxMarks: Number(form.maxMarks) || exam.maxMarks,
      passingMarks: Number(form.passingMarks) || 0,
      gradeScaleId: form.gradeScaleId || undefined,
      room: form.room.trim() || undefined,
      evaluatorId: form.evaluatorId || undefined,
      syllabus: form.syllabus.trim() || undefined,
      instructions: form.instructions.trim() || undefined,
      marksDeadline: form.marksDeadline || undefined,
    }], actor);
    toast.success("Paper updated.");
    onClose();
  };

  const subjectName = data.subjects.find((s) => s.id === exam.subjectId)?.name ?? exam.subjectId;
  const className = data.classes.find((c) => c.id === exam.classId)?.name ?? exam.classId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">{subjectName}</h3>
            <p className="text-sm text-slate-500">{className} · {group.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Date</label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Start time</label>
              <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input type="number" min={15} value={form.durationMins} onChange={(e) => set("durationMins", e.target.value)} className="input" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Max marks</label>
              <input type="number" min={1} value={form.maxMarks} onChange={(e) => set("maxMarks", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Passing marks</label>
              <input type="number" min={0} value={form.passingMarks} onChange={(e) => set("passingMarks", e.target.value)} className={`input ${marksValid ? "" : "border-rose-400"}`} />
            </div>
            <div>
              <label className="label">Room</label>
              <input value={form.room} onChange={(e) => set("room", e.target.value)} placeholder="Optional" className="input" />
            </div>
          </div>
          {!marksValid && <p className="text-xs text-rose-600">Passing marks cannot exceed the maximum.</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Grade scale</label>
              <select value={form.gradeScaleId} onChange={(e) => set("gradeScaleId", e.target.value)} className="input">
                <option value="">Use examination default</option>
                {data.gradeScales.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Marks entry deadline</label>
              <input type="date" value={form.marksDeadline} onChange={(e) => set("marksDeadline", e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Evaluator</label>
            <select value={form.evaluatorId} onChange={(e) => set("evaluatorId", e.target.value)} className="input">
              <option value="">Any assigned teacher</option>
              {candidates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {candidates.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No teacher is assigned {subjectName} in {className} — allocate one from Admin → Teachers,
                or nobody will be able to enter these marks.
              </p>
            )}
          </div>

          <div>
            <label className="label">Syllabus</label>
            <textarea value={form.syllabus} onChange={(e) => set("syllabus", e.target.value)} rows={2} placeholder="Chapters covered — shown to parents" className="input resize-none" />
          </div>
          <div>
            <label className="label">Instructions</label>
            <textarea value={form.instructions} onChange={(e) => set("instructions", e.target.value)} rows={2} placeholder="Exam-day instructions — shown to parents" className="input resize-none" />
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={!marksValid} className="btn-primary flex-1 py-2.5">
            <CheckCircle2 className="h-4 w-4" /> Save paper
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Timetable
// ─────────────────────────────────────────────────────────────
function TimetableTab({ group, papers }: { group: ExamGroup; papers: SubjectExam[] }) {
  const data = useData();
  const byDate = useMemo(() => {
    const map = new Map<string, SubjectExam[]>();
    for (const p of [...papers].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
      map.set(p.date, [...(map.get(p.date) ?? []), p]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [papers]);

  if (papers.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="No papers scheduled yet" hint="Add subject papers and the timetable builds itself." />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Examination timetable"
        subtitle={`${papers.length} papers across ${byDate.length} day${byDate.length === 1 ? "" : "s"} · visible to teachers and parents`}
        icon={<CalendarDays className="h-5 w-5" />}
        action={<button onClick={() => window.print()} className="btn-ghost px-3 py-1.5 text-xs no-print">Print</button>}
      />
      <div className="divide-y divide-slate-100">
        {byDate.map(([date, list]) => (
          <div key={date} className="px-5 py-4">
            <p className="text-sm font-bold text-slate-800">
              {formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => {
                const cls = data.classes.find((c) => c.id === p.classId);
                const subject = data.subjects.find((s) => s.id === p.subjectId);
                return (
                  <div key={p.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{subject?.name ?? p.subjectId}</p>
                      <Badge tone="brand">{cls?.name}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" /> {formatTime(p.startTime)} · {p.durationMins} min · {p.maxMarks} marks
                      {p.room ? ` · ${p.room}` : ""}
                    </p>
                    {p.syllabus && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{p.syllabus}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Marks entry progress
// ─────────────────────────────────────────────────────────────
function MarksTab({
  group, papers, actor,
}: { group: ExamGroup; papers: SubjectExam[]; actor: AuditActor }) {
  const data = useData();
  const [openExamId, setOpenExamId] = useState<string | null>(null);
  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? id;

  // The examination office can fill in any paper — a teacher on leave, a
  // subject with nobody allocated, or a correction after reopening.
  const open = openExamId ? data.subjectExams.find((e) => e.id === openExamId) : undefined;
  if (open) {
    return (
      <MarksSheet
        exam={open}
        actor={actor}
        canReopen
        backLabel="Marks entry"
        onBack={() => setOpenExamId(null)}
      />
    );
  }

  const reopen = (examId: string, label: string) => {
    const reason = prompt(`Reopen ${label} for editing? Give a reason for the audit log:`);
    if (reason === null) return;
    data.setMarksStatus(examId, "draft", actor, reason.trim() || undefined);

    // Tell whoever has to act on it that the sheet is editable again.
    const exam = data.subjectExams.find((e) => e.id === examId);
    const staffIds = exam
      ? Array.from(new Set(
          exam.evaluatorId
            ? [exam.evaluatorId]
            : data.teacherAssignments
                .filter((a) => a.classId === exam.classId && a.subjectId === exam.subjectId)
                .map((a) => a.teacherId),
        ))
      : [];
    if (staffIds.length > 0) {
      data.pushNotification({
        audience: "teachers",
        staffIds,
        title: `${label} marks reopened`,
        body: reason.trim()
          ? `Reopened for editing: ${reason.trim()}`
          : "The sheet has been reopened for editing.",
        category: "marks",
        link: "/teacher/marks",
      });
    }
    toast.success(`${label} reopened for editing.`);
  };

  if (papers.length === 0) {
    return <Card className="p-8"><EmptyState title="No papers to mark yet" /></Card>;
  }

  return (
    <div className="space-y-6">
      {group.classIds.map((classId) => {
        const cls = data.classes.find((c) => c.id === classId);
        const students = data.students.filter((s) => s.classId === classId && s.status === "active");
        const classPapers = papers.filter((p) => p.classId === classId);
        if (classPapers.length === 0) return null;

        const done = classPapers.filter((p) => {
          const s = sheetFor(p.id, data.examMarks);
          return s?.status === "submitted" || s?.status === "verified" || s?.status === "published";
        }).length;

        return (
          <Card key={classId}>
            <CardHeader
              title={cls?.name ?? classId}
              subtitle={`${students.length} students · ${done}/${classPapers.length} papers submitted`}
              icon={<Users className="h-5 w-5" />}
              action={
                <div className="w-32">
                  <Progress
                    value={classPapers.length ? (done / classPapers.length) * 100 : 0}
                    tone={done === classPapers.length ? "green" : done ? "amber" : "slate"}
                  />
                </div>
              }
            />
            <div className="divide-y divide-slate-50">
              {classPapers.map((p) => {
                const sheet = sheetFor(p.id, data.examMarks);
                const prog = sheetProgress(sheet, students.length);
                const meta = SHEET_STATUS_META[prog.status];
                const teacher = data.staff.find((s) => s.id === (p.evaluatorId ?? sheet?.enteredBy));
                const label = `${subjectName(p.subjectId)} · ${cls?.name}`;
                return (
                  <div key={p.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => setOpenExamId(p.id)}
                      className="min-w-0 text-left"
                      title={`Open the ${subjectName(p.subjectId)} marks sheet`}
                    >
                      <p className="font-medium text-slate-800 hover:text-brand-600">{subjectName(p.subjectId)}</p>
                      <p className="truncate text-xs text-slate-400">
                        {formatDate(p.date)} · {p.maxMarks} marks
                        {teacher ? ` · ${teacher.name}` : " · no evaluator assigned"}
                        {sheet?.submittedAt ? ` · submitted ${formatDate(sheet.submittedAt)}` : ""}
                        {sheet?.reopenReason ? ` · reopened: ${sheet.reopenReason}` : ""}
                      </p>
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-600">
                        {prog.entered}/{prog.total}
                      </span>
                      <div className="w-24"><Progress value={prog.percent} tone={prog.complete ? "green" : prog.percent ? "amber" : "slate"} /></div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {(prog.status === "not-started" || prog.status === "draft") && (
                        <button
                          onClick={() => setOpenExamId(p.id)}
                          className="btn-ghost px-2.5 py-1.5 text-xs"
                          title="Enter marks for this paper"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {prog.entered > 0 ? "Continue" : "Enter marks"}
                        </button>
                      )}
                      {prog.status === "submitted" && (
                        <>
                          <button
                            onClick={() => { data.setMarksStatus(p.id, "verified", actor); toast.success(`${label} verified.`); }}
                            className="btn-ghost px-2.5 py-1.5 text-xs"
                            title="Mark as verified"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Verify
                          </button>
                          <button onClick={() => reopen(p.id, label)} className="btn-ghost px-2.5 py-1.5 text-xs" title="Reopen for editing">
                            <Unlock className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {prog.status === "verified" && (
                        <button onClick={() => reopen(p.id, label)} className="btn-ghost px-2.5 py-1.5 text-xs" title="Reopen for editing">
                          <Unlock className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Results — verification and publishing
// ─────────────────────────────────────────────────────────────
function ResultsTab({
  group, papers, actor,
}: { group: ExamGroup; papers: SubjectExam[]; actor: AuditActor }) {
  const data = useData();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const publish = (classId: string, override: boolean) => {
    const cls = data.classes.find((c) => c.id === classId);
    const students = data.students.filter((s) => s.classId === classId && s.status === "active");
    const classPapers = papers.filter((p) => p.classId === classId);
    if (students.length === 0) {
      toast.error(`${cls?.name} has no active students.`);
      return;
    }
    setBusy(classId);

    const now = new Date().toISOString();
    let results = students.map((student) =>
      computeStudentResult({
        group,
        student,
        cls,
        exams: classPapers,
        sheets: data.examMarks,
        subjects: data.subjects,
        scales: data.gradeScales,
        attendanceRate: studentAttendanceRate(data.attendance, student.id).rate,
      }),
    );
    if (group.rankingEnabled) results = assignRanks(results);
    results = results.map((r) => ({ ...r, publishedAt: now, publishedBy: actor.id }));

    data.publishResults(group.id, [classId], results, actor);
    data.pushNotification({
      audience: "parents",
      classIds: [classId],
      title: `${group.name} result published`,
      body: `Results for ${cls?.name} are now available in the parent portal.`,
      category: "result",
      link: "/parent/exams",
    });
    toast.success(
      `${results.length} result${results.length === 1 ? "" : "s"} published for ${cls?.name}${override ? " (validation overridden)" : ""}.`,
    );
    setBusy(null);
  };

  const unpublish = (classId: string) => {
    const cls = data.classes.find((c) => c.id === classId);
    if (!confirm(`Withdraw ${cls?.name}'s results? Parents will lose access until you publish again.`)) return;
    data.unpublishResults(group.id, [classId], actor);
    toast.success(`${cls?.name} results withdrawn.`);
  };

  return (
    <div className="space-y-6">
      {group.classIds.map((classId) => {
        const cls = data.classes.find((c) => c.id === classId);
        if (!cls) return null;
        const students = data.students.filter((s) => s.classId === classId && s.status === "active");
        const classPapers = papers.filter((p) => p.classId === classId);
        const issues = validateClassForPublish({
          cls, exams: classPapers, sheets: data.examMarks, students, subjects: data.subjects,
        });
        const blocked = hasBlockingIssues(issues);
        const published = group.publishedClassIds?.includes(classId);
        const publishedCount = data.studentResults.filter(
          (r) => r.groupId === group.id && r.classId === classId,
        ).length;

        return (
          <Card key={classId}>
            <CardHeader
              title={cls.name}
              subtitle={`${students.length} students · ${classPapers.length} papers`}
              icon={<FileCheck2 className="h-5 w-5" />}
              action={
                published
                  ? <Badge tone="green">Published · {publishedCount} results</Badge>
                  : blocked
                    ? <Badge tone="red">Not ready</Badge>
                    : <Badge tone="violet">Ready to publish</Badge>
              }
            />

            <div className="space-y-3 p-5">
              {issues.length === 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Everything checks out — no missing or invalid marks.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {issues.map((issue, i) => (
                    <p
                      key={i}
                      className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs ${
                        issue.level === "error" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {issue.message}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setPreview(preview === classId ? null : classId)} className="btn-ghost px-3 py-1.5 text-xs">
                  <Eye className="h-3.5 w-3.5" /> {preview === classId ? "Hide" : "Preview"} results
                </button>

                {published ? (
                  <button onClick={() => unpublish(classId)} className="btn-ghost px-3 py-1.5 text-xs text-rose-600">
                    <Unlock className="h-3.5 w-3.5" /> Unpublish
                  </button>
                ) : blocked ? (
                  <button
                    onClick={() => {
                      if (!confirm(
                        `${cls.name} has unresolved validation errors. Publish anyway?\n\nThis is recorded in the audit log.`,
                      )) return;
                      publish(classId, true);
                    }}
                    disabled={busy === classId}
                    className="btn-ghost px-3 py-1.5 text-xs text-amber-700"
                  >
                    {busy === classId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    Override &amp; publish
                  </button>
                ) : (
                  <button onClick={() => publish(classId, false)} disabled={busy === classId} className="btn-primary px-3 py-1.5 text-xs">
                    {busy === classId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Publish to parents
                  </button>
                )}

                {published && (
                  <Link href={`/admin/report-cards?group=${group.id}&class=${classId}`} className="btn-ghost px-3 py-1.5 text-xs">
                    <FileCheck2 className="h-3.5 w-3.5" /> Report cards
                  </Link>
                )}
              </div>

              {published && (
                <p className="flex items-start gap-1.5 text-xs text-slate-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Published results are a frozen snapshot — later edits to marks, subjects or the grade
                  scale do not change what parents already have.
                </p>
              )}
            </div>

            {preview === classId && (
              <ResultPreview group={group} classId={classId} papers={classPapers} />
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ResultPreview({
  group, classId, papers,
}: { group: ExamGroup; classId: string; papers: SubjectExam[] }) {
  const data = useData();
  const cls = data.classes.find((c) => c.id === classId);
  const students = data.students.filter((s) => s.classId === classId && s.status === "active");

  const rows = useMemo(() => {
    let out = students.map((student) =>
      computeStudentResult({
        group, student, cls, exams: papers, sheets: data.examMarks,
        subjects: data.subjects, scales: data.gradeScales,
        attendanceRate: studentAttendanceRate(data.attendance, student.id).rate,
      }),
    );
    if (group.rankingEnabled) out = assignRanks(out);
    return out.sort((a, b) => a.rollNo - b.rollNo);
  }, [students, group, cls, papers, data.examMarks, data.subjects, data.gradeScales, data.attendance]);

  if (rows.length === 0) return <div className="p-5"><EmptyState title="No active students in this class" /></div>;

  return (
    <div className="border-t border-slate-100">
      <Table>
        <thead>
          <tr className="border-b border-slate-100">
            <Th>Roll</Th><Th>Student</Th>
            {papers.map((p) => (
              <Th key={p.id}>{data.subjects.find((s) => s.id === p.subjectId)?.name ?? p.subjectId}</Th>
            ))}
            <Th>Total</Th><Th>%</Th><Th>Grade</Th>{group.rankingEnabled && <Th>Rank</Th>}<Th>Result</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <Td>{r.rollNo}</Td>
              <Td><span className="font-medium text-slate-800">{r.studentName}</span></Td>
              {papers.map((p) => {
                const line = r.lines.find((l) => l.subjectId === p.subjectId);
                return (
                  <Td key={p.id}>
                    {line?.obtained === null || line === undefined
                      ? <span className="text-slate-300">{line?.grade ?? "—"}</span>
                      : <span className={line.passed ? "text-slate-700" : "font-semibold text-rose-600"}>{line.obtained}</span>}
                  </Td>
                );
              })}
              <Td>{r.totalObtained}/{r.totalMax}</Td>
              <Td>{r.percentage}%</Td>
              <Td><Badge tone="brand">{r.overallGrade}</Badge></Td>
              {group.rankingEnabled && <Td>{r.rank ?? "—"}</Td>}
              <Td><Badge tone={r.passed ? "green" : "red"}>{r.passed ? "Pass" : "Fail"}</Badge></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
