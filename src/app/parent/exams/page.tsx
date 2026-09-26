"use client";

// ─────────────────────────────────────────────────────────────
// Parent → Examinations
// ─────────────────────────────────────────────────────────────
// Before an examination: the timetable, syllabus and instructions for this
// child's class. After publication: their marks, grades and report card.
// Draft and unpublished marks never reach this page.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { useChild, ChildSwitcher } from "../child-context";
import { useData } from "@/lib/store";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Badge, EmptyState, Loading, Stat } from "@/components/ui";
import { ExamReportCard } from "@/components/ExamReportCard";
import { downloadReportCards } from "@/lib/reportCardPdf";
import { formatDate, formatTime, todayISO } from "@/lib/utils";
import { isClassPublished } from "@/lib/exams";
import {
  CalendarDays, ClipboardList, Award, Download, Lock, Clock, BookOpen, Loader2, Info, X, Eye,
} from "lucide-react";

export default function ParentExams() {
  const { child } = useChild();
  const data = useData();
  const today = todayISO();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const cls = child ? data.classes.find((c) => c.id === child.classId) : undefined;

  // Papers for this child's class, in examinations that have left draft.
  const papers = useMemo(() => {
    if (!child) return [];
    return data.subjectExams
      .filter((e) => e.classId === child.classId)
      .filter((e) => {
        const g = data.examGroups.find((x) => x.id === e.groupId);
        return g && g.status !== "draft" && g.status !== "archived";
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [child, data.subjectExams, data.examGroups]);

  const upcoming = papers.filter((p) => p.date >= today);
  const myResults = useMemo(
    () => (child ? data.studentResults.filter((r) => r.studentId === child.id) : [])
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [data.studentResults, child],
  );

  if (!child) return <EmptyState title="No child linked." />;

  const download = async (resultId: string) => {
    const result = myResults.find((r) => r.id === resultId);
    if (!result) return;
    setBusy(true);
    try {
      await downloadReportCards([result]);
      toast.success("Report card downloaded.");
    } catch {
      toast.error("Couldn't generate the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Examinations</h1>
          <p className="mt-1 text-sm text-slate-500">
            {child.firstName}&apos;s examination schedule and results · {cls?.name}
          </p>
        </div>
        <ChildSwitcher />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 no-print">
        <Stat label="Upcoming papers" value={upcoming.length} tone="sky" icon={<CalendarDays className="h-5 w-5" />} hint={cls?.name} />
        <Stat label="Results published" value={myResults.length} tone="green" icon={<Award className="h-5 w-5" />} />
        <Stat
          label="Latest percentage"
          value={myResults[0] ? `${myResults[0].percentage}%` : "—"}
          tone="violet"
          icon={<ClipboardList className="h-5 w-5" />}
          hint={myResults[0]?.groupName}
        />
      </div>

      {/* ── Results ── */}
      <Card className="no-print">
        <CardHeader title="Results" subtitle="Available once the school publishes them" icon={<Award className="h-5 w-5" />} />
        {data.loading && myResults.length === 0 ? (
          <Loading label="Loading results…" />
        ) : myResults.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Lock className="h-8 w-8" />}
              title="No results published yet"
              hint="Marks stay private until the school publishes the examination result. You'll see them here as soon as they're out."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myResults.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{r.groupName}</p>
                    <p className="text-xs text-slate-400">
                      {r.sessionName} · published {formatDate(r.publishedAt)} · {r.lines.length} subjects
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">{r.totalObtained}/{r.totalMax}</span>
                    <Badge tone="brand">{r.percentage}%</Badge>
                    <Badge tone="violet">{r.overallGrade}</Badge>
                    {r.rank !== undefined && <Badge tone="sky">Rank #{r.rank}</Badge>}
                    <Badge tone={r.passed ? "green" : "red"}>{r.passed ? "Pass" : "Fail"}</Badge>
                    <button onClick={() => setOpen(open === r.id ? null : r.id)} className="btn-ghost px-3 py-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" /> {open === r.id ? "Hide" : "View"}
                    </button>
                    <button onClick={() => download(r.id)} disabled={busy} className="btn-primary px-3 py-1.5 text-xs">
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Report card
                    </button>
                  </div>
                </div>

                {/* Subject breakdown */}
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Subject</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">Marks</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {r.lines.map((l) => (
                        <tr key={l.subjectId}>
                          <td className="px-3 py-2 font-medium text-slate-800">{l.subjectName}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${l.passed ? "text-slate-700" : "text-rose-600"}`}>
                            {l.obtained === null ? "—" : `${l.obtained}/${l.maxMarks}`}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex min-w-[2.25rem] justify-center rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                              {l.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {r.classTeacherRemark && (
                  <p className="mt-2 text-sm italic text-slate-500">&ldquo;{r.classTeacherRemark}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Timetable ── */}
      <Card className="no-print">
        <CardHeader
          title="Examination schedule"
          subtitle={papers.length ? `${papers.length} papers for ${cls?.name}` : undefined}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        {papers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title="No examinations scheduled"
              hint="The timetable appears here as soon as the school publishes it."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(
              papers.reduce<Record<string, typeof papers>>((acc, p) => {
                (acc[p.groupId] ??= []).push(p);
                return acc;
              }, {}),
            ).map(([groupId, list]) => {
              const group = data.examGroups.find((g) => g.id === groupId);
              const published = isClassPublished(group, child.classId);
              return (
                <div key={groupId} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{group?.name}</p>
                    {published
                      ? <Badge tone="green">Result published</Badge>
                      : <Badge tone="sky">{formatDate(group?.startDate ?? "")} → {formatDate(group?.endDate ?? "")}</Badge>}
                  </div>
                  <div className="mt-3 space-y-2">
                    {list.map((p) => (
                      <div key={p.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800">{subjectName(p.subjectId)}</p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(p.date, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                            {formatTime(p.startTime)} · {p.durationMins} min · {p.maxMarks} marks
                            {p.room ? ` · ${p.room}` : ""}
                          </p>
                        </div>
                        {p.syllabus && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
                            <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p.syllabus}
                          </p>
                        )}
                        {p.instructions && (
                          <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p.instructions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Full report card */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-slate-900/50 no-print" onClick={() => setOpen(null)} />
          <div className="relative my-8 w-full max-w-4xl">
            <div className="mb-3 flex justify-end gap-2 no-print">
              <button onClick={() => download(open)} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
              </button>
              <button onClick={() => setOpen(null)} className="rounded-lg bg-white p-2 text-slate-500 shadow hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ExamReportCard result={myResults.find((r) => r.id === open)!} />
          </div>
        </div>
      )}
    </div>
  );
}
