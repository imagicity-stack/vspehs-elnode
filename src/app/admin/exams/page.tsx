"use client";

// ─────────────────────────────────────────────────────────────
// Admin → Examinations
// ─────────────────────────────────────────────────────────────
// The examination dashboard: what is coming up, what is waiting on marks, and
// what is ready to publish — plus the list of exam groups and their creation.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useData, type AuditActor } from "@/lib/store";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Badge, Stat, EmptyState, Loading, Progress } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/utils";
import { ExamGroup } from "@/lib/types";
import { GROUP_STATUS_META, sheetFor } from "@/lib/exams";
import {
  ClipboardList, Plus, X, CalendarDays, FileCheck2, Send, Award, CheckCircle2,
  AlertTriangle, ArrowRight, PieChart, Pencil, Trash2, BookOpen,
} from "lucide-react";

const uid = () => `eg-${Math.random().toString(36).slice(2, 9)}`;

export default function AdminExams() {
  const { user } = useAuth();
  const data = useData();
  const today = todayISO();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ExamGroup | null>(null);

  const actor: AuditActor = {
    id: user?.staffId ?? user?.uid ?? "admin",
    name: user?.displayName ?? "Super Admin",
    role: user?.role ?? "superadmin",
  };

  const groups = useMemo(
    () => [...data.examGroups].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [data.examGroups],
  );

  // Headline figures, computed across every paper in every live examination.
  const stats = useMemo(() => {
    const live = data.examGroups.filter((g) => g.status !== "archived");
    const upcoming = live.filter((g) => g.startDate > today).length;
    const ongoing = live.filter((g) => g.startDate <= today && g.endDate >= today).length;

    let pending = 0;
    let submitted = 0;
    for (const exam of data.subjectExams) {
      const group = data.examGroups.find((g) => g.id === exam.groupId);
      if (!group || group.status === "archived") continue;
      const sheet = sheetFor(exam.id, data.examMarks);
      if (sheet?.status === "submitted" || sheet?.status === "verified" || sheet?.status === "published") submitted += 1;
      else pending += 1;
    }

    // A class is publishable once every one of its papers is submitted.
    let readyClasses = 0;
    for (const group of live) {
      for (const classId of group.classIds) {
        if (group.publishedClassIds?.includes(classId)) continue;
        const papers = data.subjectExams.filter((e) => e.groupId === group.id && e.classId === classId);
        if (papers.length === 0) continue;
        const allIn = papers.every((p) => {
          const s = sheetFor(p.id, data.examMarks);
          return s?.status === "submitted" || s?.status === "verified";
        });
        if (allIn) readyClasses += 1;
      }
    }

    return {
      upcoming,
      ongoing,
      pending,
      submitted,
      readyClasses,
      published: live.reduce((n, g) => n + (g.publishedClassIds?.length ?? 0), 0),
    };
  }, [data.examGroups, data.subjectExams, data.examMarks, today]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Examinations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Exam sessions, subject papers, marks entry and result publishing.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Create examination
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Stat label="Upcoming" value={stats.upcoming} tone="sky" icon={<CalendarDays className="h-5 w-5" />} hint="Not started yet" />
        <Stat label="Ongoing" value={stats.ongoing} tone="brand" icon={<ClipboardList className="h-5 w-5" />} hint="In progress today" />
        <Stat label="Marks pending" value={stats.pending} tone={stats.pending ? "amber" : "slate"} icon={<Pencil className="h-5 w-5" />} hint="Papers not submitted" />
        <Stat label="Submitted" value={stats.submitted} tone="green" icon={<FileCheck2 className="h-5 w-5" />} hint="Papers marked and locked" />
        <Stat label="Ready to publish" value={stats.readyClasses} tone={stats.readyClasses ? "violet" : "slate"} icon={<Send className="h-5 w-5" />} hint="Classes fully marked" />
        <Stat label="Published" value={stats.published} tone="green" icon={<Award className="h-5 w-5" />} hint="Classes live to parents" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction href="/admin/grade-scales" icon={<Award className="h-4 w-4" />} label="Grade scales" hint="Grading systems" />
        <QuickAction href="/admin/teachers" icon={<BookOpen className="h-4 w-4" />} label="Teacher allocation" hint="Who marks what" />
        <QuickAction href="/admin/report-cards" icon={<FileCheck2 className="h-4 w-4" />} label="Report cards" hint="Generate & download" />
        <QuickAction href="/admin/audit-logs" icon={<PieChart className="h-4 w-4" />} label="Audit log" hint="Examination actions" />
      </div>

      {data.gradeScales.length === 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No grade scale exists yet. Results can&apos;t be graded without one —{" "}
            <Link href="/admin/grade-scales" className="font-semibold underline">create one first</Link>.
          </span>
        </div>
      )}

      <Card>
        <CardHeader title="Examination sessions" subtitle={`${groups.length} total`} icon={<ClipboardList className="h-5 w-5" />} />
        {data.loading && groups.length === 0 ? (
          <Loading label="Loading examinations…" />
        ) : groups.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="No examinations yet"
              hint="Create an exam group — Half Yearly, Unit Test, Annual — then add subject papers class by class."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groups.map((g) => {
              const papers = data.subjectExams.filter((e) => e.groupId === g.id);
              const done = papers.filter((p) => {
                const s = sheetFor(p.id, data.examMarks);
                return s?.status === "submitted" || s?.status === "verified" || s?.status === "published";
              }).length;
              const pct = papers.length ? Math.round((done / papers.length) * 100) : 0;
              const meta = GROUP_STATUS_META[g.status];
              return (
                <div key={g.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/exams/${g.id}`} className="font-semibold text-slate-900 hover:text-brand-600">
                        {g.name}
                      </Link>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {(g.publishedClassIds?.length ?? 0) > 0 && (
                        <Badge tone="green">{g.publishedClassIds.length} class{g.publishedClassIds.length === 1 ? "" : "es"} live</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {g.sessionName} · {formatDate(g.startDate)} → {formatDate(g.endDate)} ·{" "}
                      {g.classIds.length} class{g.classIds.length === 1 ? "" : "es"} · {papers.length} paper{papers.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-36">
                      <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                        <span>Marks</span><span>{done}/{papers.length}</span>
                      </div>
                      <Progress value={pct} tone={pct === 100 ? "green" : pct > 0 ? "amber" : "slate"} />
                    </div>
                    <button
                      onClick={() => setEditing(g)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                      title="Edit examination"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <Link href={`/admin/exams/${g.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {(creating || editing) && (
        <ExamGroupModal
          group={editing}
          actor={actor}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function QuickAction({
  href, icon, label, hint,
}: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-4 transition hover:shadow-soft">
      <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
        <p className="truncate text-xs text-slate-400">{hint}</p>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// Create / edit an exam group
// ─────────────────────────────────────────────────────────────
function ExamGroupModal({
  group, actor, onClose,
}: { group: ExamGroup | null; actor: AuditActor; onClose: () => void }) {
  const data = useData();
  const currentSession = data.academicSessions.find((s) => s.isCurrent);
  const [form, setForm] = useState({
    name: group?.name ?? "",
    sessionName: group?.sessionName ?? currentSession?.name ?? defaultSessionName(),
    description: group?.description ?? "",
    startDate: group?.startDate ?? todayISO(),
    endDate: group?.endDate ?? todayISO(),
    defaultStartTime: group?.defaultStartTime ?? "09:00",
    defaultDurationMins: String(group?.defaultDurationMins ?? 180),
    defaultMaxMarks: String(group?.defaultMaxMarks ?? 80),
    defaultPassingMarks: String(group?.defaultPassingMarks ?? 27),
    gradeScaleId: group?.gradeScaleId ?? data.gradeScales.find((g) => g.active)?.id ?? "",
    resultDate: group?.resultDate ?? "",
    status: group?.status ?? ("draft" as ExamGroup["status"]),
    rankingEnabled: group?.rankingEnabled ?? false,
  });
  const [classIds, setClassIds] = useState<string[]>(group?.classIds ?? []);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const toggleClass = (id: string) =>
    setClassIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const datesValid = form.startDate <= form.endDate;
  const marksValid = Number(form.defaultPassingMarks) <= Number(form.defaultMaxMarks);
  const canSave = form.name.trim() && classIds.length > 0 && datesValid && marksValid;

  const save = () => {
    if (!canSave) return;
    const next: ExamGroup = {
      id: group?.id ?? uid(),
      name: form.name.trim(),
      sessionId: currentSession?.id ?? form.sessionName,
      sessionName: form.sessionName.trim(),
      classIds,
      description: form.description.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      defaultStartTime: form.defaultStartTime,
      defaultDurationMins: Number(form.defaultDurationMins) || 180,
      defaultMaxMarks: Number(form.defaultMaxMarks) || 80,
      defaultPassingMarks: Number(form.defaultPassingMarks) || 0,
      gradeScaleId: form.gradeScaleId || undefined,
      resultDate: form.resultDate || undefined,
      status: form.status,
      rankingEnabled: form.rankingEnabled,
      publishedClassIds: group?.publishedClassIds ?? [],
      createdAt: group?.createdAt ?? new Date().toISOString(),
      createdBy: group?.createdBy ?? actor.id,
    };
    data.saveExamGroup(next, actor);
    toast.success(`"${next.name}" saved.`);
    onClose();
  };

  const remove = () => {
    if (!group) return;
    const papers = data.subjectExams.filter((e) => e.groupId === group.id).length;
    if (!confirm(
      `Delete "${group.name}"? This removes ${papers} subject paper${papers === 1 ? "" : "s"}, their marks and any published results.`,
    )) return;
    data.deleteExamGroup(group.id, actor);
    toast.success(`"${group.name}" deleted.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">{group ? "Edit examination" : "Create examination"}</h3>
            <p className="text-sm text-slate-500">These defaults are suggested for every subject paper you add.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Examination name</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Half Yearly Examination" className="input" autoFocus />
            </div>
            <div>
              <label className="label">Academic session</label>
              <input value={form.sessionName} onChange={(e) => set("sessionName", e.target.value)} placeholder="2026-27" className="input" />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional" className="input" />
          </div>

          <div>
            <label className="label">Applicable classes</label>
            {data.classes.length === 0 ? (
              <p className="text-sm text-amber-600">No classes exist yet — add them from Admin → Classes.</p>
            ) : (
              <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-3">
                {data.classes.map((c) => {
                  const on = classIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition ${
                        on ? "border-brand-400 bg-brand-50" : "border-transparent hover:bg-white"
                      }`}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggleClass(c.id)} className="h-3.5 w-3.5 accent-brand-600" />
                      <span className="truncate font-medium text-slate-700">{c.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Start date</label>
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">End date</label>
              <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={`input ${datesValid ? "" : "border-rose-400"}`} />
              {!datesValid && <p className="mt-1 text-xs text-rose-600">End date is before the start date.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Paper defaults</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="label">Start time</label>
                <input type="time" value={form.defaultStartTime} onChange={(e) => set("defaultStartTime", e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Duration (min)</label>
                <input type="number" min={15} value={form.defaultDurationMins} onChange={(e) => set("defaultDurationMins", e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Max marks</label>
                <input type="number" min={1} value={form.defaultMaxMarks} onChange={(e) => set("defaultMaxMarks", e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Passing</label>
                <input type="number" min={0} value={form.defaultPassingMarks} onChange={(e) => set("defaultPassingMarks", e.target.value)} className={`input ${marksValid ? "" : "border-rose-400"}`} />
              </div>
            </div>
            {!marksValid && <p className="mt-1 text-xs text-rose-600">Passing marks cannot exceed the maximum.</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Grade scale</label>
              <select value={form.gradeScaleId} onChange={(e) => set("gradeScaleId", e.target.value)} className="input">
                <option value="">None</option>
                {data.gradeScales.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Result date</label>
              <input type="date" value={form.resultDate} onChange={(e) => set("resultDate", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
                {Object.entries(GROUP_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.rankingEnabled} onChange={(e) => set("rankingEnabled", e.target.checked)} className="h-3.5 w-3.5 accent-brand-600" />
            Calculate class rank when results are published
          </label>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          {group && (
            <button onClick={remove} className="btn-ghost text-rose-600">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={!canSave} className="btn-primary flex-1 py-2.5">
            <CheckCircle2 className="h-4 w-4" /> {group ? "Save changes" : "Create examination"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "2026-27" from today's date, rolling over in April. */
function defaultSessionName(now = new Date()) {
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
