"use client";

// ─────────────────────────────────────────────────────────────
// Admin → Report Cards
// ─────────────────────────────────────────────────────────────
// Generation and download of report cards, always from published result
// snapshots — never from live marks (business rule 5).
// ─────────────────────────────────────────────────────────────

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData, type AuditActor } from "@/lib/store";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Avatar, Badge, EmptyState, Loading, Stat } from "@/components/ui";
import { ExamReportCard } from "@/components/ExamReportCard";
import { downloadReportCards } from "@/lib/reportCardPdf";
import { formatDate } from "@/lib/utils";
import { ReportCardRecord, StudentExamResult } from "@/lib/types";
import {
  FileCheck2, Download, Search, Eye, X, Loader2, Lock, Users, Award, CheckSquare, Square, Printer,
} from "lucide-react";

function ReportCardsInner() {
  const { user } = useAuth();
  const data = useData();
  const params = useSearchParams();

  const [groupId, setGroupId] = useState(params.get("group") ?? "");
  const [classId, setClassId] = useState(params.get("class") ?? "all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<StudentExamResult | null>(null);
  const [busy, setBusy] = useState(false);

  const actor: AuditActor = {
    id: user?.staffId ?? user?.uid ?? "admin",
    name: user?.displayName ?? "Super Admin",
    role: user?.role ?? "superadmin",
  };

  // Only examinations that actually have published results are offered.
  const groups = useMemo(
    () => data.examGroups
      .filter((g) => data.studentResults.some((r) => r.groupId === g.id))
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [data.examGroups, data.studentResults],
  );

  const activeGroupId = groupId || groups[0]?.id || "";
  const group = data.examGroups.find((g) => g.id === activeGroupId);

  const results = useMemo(
    () => data.studentResults
      .filter((r) => r.groupId === activeGroupId)
      .filter((r) => classId === "all" || r.classId === classId)
      .filter((r) => !q
        || r.studentName.toLowerCase().includes(q.toLowerCase())
        || r.admissionNo.includes(q))
      .sort((a, b) => a.className.localeCompare(b.className) || a.rollNo - b.rollNo),
    [data.studentResults, activeGroupId, classId, q],
  );

  // Selections are per examination; switching group would otherwise carry
  // stale ids that no longer resolve.
  useEffect(() => setSelected(new Set()), [activeGroupId]);

  const classesWithResults = useMemo(
    () => Array.from(new Set(data.studentResults.filter((r) => r.groupId === activeGroupId).map((r) => r.classId))),
    [data.studentResults, activeGroupId],
  );

  const toggle = (id: string) =>
    setSelected((cur) => {
      const n = new Set(cur);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const generate = async (rows: StudentExamResult[], label: string) => {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      await downloadReportCards(rows, {
        filename: rows.length === 1
          ? `Report-Card-${rows[0].admissionNo}`
          : `Report-Cards-${label}`,
      });
      const records: ReportCardRecord[] = rows.map((r) => ({
        id: `rc-${r.groupId}-${r.studentId}`,
        resultId: r.id,
        groupId: r.groupId,
        studentId: r.studentId,
        verificationId: r.verificationId,
        generatedAt: new Date().toISOString(),
        generatedBy: actor.id,
      }));
      data.recordReportCards(records, actor);
      toast.success(`${rows.length} report card${rows.length === 1 ? "" : "s"} generated.`);
    } catch (e) {
      toast.error(`Couldn't generate the PDF. ${e instanceof Error ? e.message : ""}`.trim());
    } finally {
      setBusy(false);
    }
  };

  const generatedCount = data.reportCards.filter((r) => r.groupId === activeGroupId).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Report Cards</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generated from published results only — a result must be published before its card exists.
          </p>
        </div>
        {results.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => generate(results.filter((r) => selected.has(r.id)), `${group?.name}-selection`)}
              disabled={selected.size === 0 || busy}
              className="btn-ghost"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Selected ({selected.size})
            </button>
            <button onClick={() => generate(results, group?.name ?? "examination")} disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download all ({results.length})
            </button>
          </div>
        )}
      </div>

      {data.loading && data.studentResults.length === 0 ? (
        <Card><Loading label="Loading results…" /></Card>
      ) : groups.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Lock className="h-8 w-8" />}
            title="No published results yet"
            hint="Publish an examination's results first — report cards are always built from the published snapshot."
          />
          <div className="mt-4 flex justify-center">
            <Link href="/admin/exams" className="btn-ghost">Go to examinations</Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Published results" value={data.studentResults.filter((r) => r.groupId === activeGroupId).length} tone="brand" icon={<Award className="h-5 w-5" />} hint={group?.name} />
            <Stat label="Classes live" value={classesWithResults.length} tone="green" icon={<Users className="h-5 w-5" />} />
            <Stat label="Cards generated" value={generatedCount} tone="violet" icon={<FileCheck2 className="h-5 w-5" />} hint="Recorded in the audit log" />
          </div>

          <Card>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <select value={activeGroupId} onChange={(e) => setGroupId(e.target.value)} className="input sm:w-64">
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input sm:w-44">
                  <option value="all">All classes</option>
                  {classesWithResults.map((cid) => (
                    <option key={cid} value={cid}>
                      {data.classes.find((c) => c.id === cid)?.name ?? cid}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" className="input pl-9 sm:w-52" />
                </div>
                <button
                  onClick={() => setSelected(new Set(results.map((r) => r.id)))}
                  className="btn-ghost whitespace-nowrap text-sm"
                >
                  Select all
                </button>
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())} className="btn-ghost whitespace-nowrap text-sm">Clear</button>
                )}
              </div>
            </div>

            {results.length === 0 ? (
              <div className="p-8"><EmptyState title="No results match" /></div>
            ) : (
              <div className="divide-y divide-slate-50">
                {results.map((r) => {
                  const on = selected.has(r.id);
                  const generated = data.reportCards.find((x) => x.resultId === r.id);
                  return (
                    <div key={r.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <button onClick={() => toggle(r.id)} className="flex min-w-0 items-center gap-3 text-left">
                        {on ? <CheckSquare className="h-4 w-4 shrink-0 text-brand-600" /> : <Square className="h-4 w-4 shrink-0 text-slate-300" />}
                        <Avatar name={r.studentName} src={r.photoUrl} size={34} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{r.studentName}</p>
                          <p className="truncate text-xs text-slate-400">
                            {r.className} · Roll {r.rollNo} · {r.admissionNo}
                            {generated ? ` · card generated ${formatDate(generated.generatedAt)}` : ""}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">{r.totalObtained}/{r.totalMax}</span>
                        <Badge tone="brand">{r.overallGrade}</Badge>
                        <Badge tone={r.passed ? "green" : "red"}>{r.passed ? "Pass" : "Fail"}</Badge>
                        {r.rank !== undefined && <Badge tone="violet">#{r.rank}</Badge>}
                        <button onClick={() => setPreview(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" title="Preview">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => generate([r], r.admissionNo)}
                          disabled={busy}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setPreview(null)} />
          <div className="relative my-8 w-full max-w-4xl">
            <div className="mb-3 flex justify-end gap-2 no-print">
              <button onClick={() => window.print()} className="btn-ghost bg-white"><Printer className="h-4 w-4" /> Print</button>
              <button onClick={() => generate([preview], preview.admissionNo)} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
              </button>
              <button onClick={() => setPreview(null)} className="rounded-lg bg-white p-2 text-slate-500 shadow hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ExamReportCard result={preview} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReportCards() {
  return (
    <Suspense fallback={<div className="p-8"><Loading /></div>}>
      <ReportCardsInner />
    </Suspense>
  );
}
