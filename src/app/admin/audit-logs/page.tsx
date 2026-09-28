"use client";

// ─────────────────────────────────────────────────────────────
// Admin → Audit Log
// ─────────────────────────────────────────────────────────────
// Every sensitive examination action: who did it, when, and what changed.
// Written by the store's mutators, so a marks submission or a publish cannot
// happen without leaving a row here.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { useData } from "@/lib/store";
import { Card, CardHeader, Avatar, Badge, EmptyState, Loading, Stat } from "@/components/ui";
import { AuditAction, AuditLog } from "@/lib/types";
import { type Tone } from "@/lib/exams";
import {
  ScrollText, Search, Download, ShieldCheck, Pencil, Send, KeyRound, Award, FileCheck2,
  ClipboardList, Unlock,
} from "lucide-react";

/** Grouping and presentation for each audited action. */
const ACTION_META: Record<AuditAction, { label: string; tone: Tone; group: string; icon: React.ComponentType<{ className?: string }> }> = {
  "teacher.login-created": { label: "Login created", tone: "green", group: "Accounts", icon: ShieldCheck },
  "teacher.login-disabled": { label: "Login disabled", tone: "red", group: "Accounts", icon: ShieldCheck },
  "teacher.login-enabled": { label: "Login enabled", tone: "green", group: "Accounts", icon: ShieldCheck },
  "teacher.password-reset": { label: "Password reset", tone: "amber", group: "Accounts", icon: KeyRound },
  "teacher.assignment-changed": { label: "Assignments changed", tone: "violet", group: "Accounts", icon: ClipboardList },
  "exam.group-created": { label: "Examination created", tone: "brand", group: "Examinations", icon: ClipboardList },
  "exam.group-updated": { label: "Examination updated", tone: "sky", group: "Examinations", icon: ClipboardList },
  "exam.status-changed": { label: "Status changed", tone: "sky", group: "Examinations", icon: ClipboardList },
  "exam.subject-created": { label: "Papers added", tone: "brand", group: "Examinations", icon: ClipboardList },
  "exam.subject-updated": { label: "Paper updated", tone: "sky", group: "Examinations", icon: ClipboardList },
  "exam.subject-deleted": { label: "Paper deleted", tone: "red", group: "Examinations", icon: ClipboardList },
  "gradescale.created": { label: "Grade scale created", tone: "brand", group: "Grading", icon: Award },
  "gradescale.updated": { label: "Grade scale updated", tone: "sky", group: "Grading", icon: Award },
  "marks.saved": { label: "Marks saved", tone: "slate", group: "Marks", icon: Pencil },
  "marks.submitted": { label: "Marks submitted", tone: "brand", group: "Marks", icon: Pencil },
  "marks.reopened": { label: "Marks reopened", tone: "amber", group: "Marks", icon: Unlock },
  "marks.verified": { label: "Marks verified", tone: "violet", group: "Marks", icon: ShieldCheck },
  "result.published": { label: "Result published", tone: "green", group: "Results", icon: Send },
  "result.unpublished": { label: "Result withdrawn", tone: "red", group: "Results", icon: Send },
  "reportcard.generated": { label: "Report cards generated", tone: "violet", group: "Results", icon: FileCheck2 },
};

const GROUPS = ["All", "Accounts", "Examinations", "Grading", "Marks", "Results"];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });

export default function AdminAuditLogs() {
  const data = useData();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");

  const logs = useMemo(
    () => [...data.auditLogs]
      .sort((a, b) => b.at.localeCompare(a.at))
      .filter((l) => group === "All" || ACTION_META[l.action]?.group === group)
      .filter((l) => !q
        || l.entity.toLowerCase().includes(q.toLowerCase())
        || l.actorName.toLowerCase().includes(q.toLowerCase())
        || l.summary.toLowerCase().includes(q.toLowerCase())
        || (ACTION_META[l.action]?.label ?? l.action).toLowerCase().includes(q.toLowerCase())),
    [data.auditLogs, q, group],
  );

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ["When", "Action", "Entity", "Actor", "Role", "Summary", "Before", "After"],
      ...logs.map((l) => [
        l.at, ACTION_META[l.action]?.label ?? l.action, l.entity, l.actorName, l.actorRole,
        l.summary, l.before ?? "", l.after ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => {
        const v = String(c ?? "");
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `examination-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const countOf = (name: string) =>
    data.auditLogs.filter((l) => ACTION_META[l.action]?.group === name).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-500">
            Examination and account actions, newest first. Kept for administrative accountability.
          </p>
        </div>
        <button onClick={exportCSV} disabled={logs.length === 0} className="btn-ghost">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total entries" value={data.auditLogs.length} tone="brand" icon={<ScrollText className="h-5 w-5" />} />
        <Stat label="Marks actions" value={countOf("Marks")} tone="amber" icon={<Pencil className="h-5 w-5" />} />
        <Stat label="Result actions" value={countOf("Results")} tone="green" icon={<Send className="h-5 w-5" />} />
        <Stat label="Account actions" value={countOf("Accounts")} tone="violet" icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  group === g ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the log…" className="input pl-9 sm:w-64" />
          </div>
        </div>

        {data.loading && data.auditLogs.length === 0 ? (
          <Loading label="Loading audit log…" />
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<ScrollText className="h-8 w-8" />}
              title={data.auditLogs.length === 0 ? "Nothing logged yet" : "No entries match"}
              hint={data.auditLogs.length === 0
                ? "Creating logins, submitting marks and publishing results all leave a record here."
                : undefined}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map((l) => <LogRow key={l.id} log={l} />)}
          </div>
        )}
      </Card>
    </div>
  );
}

function LogRow({ log }: { log: AuditLog }) {
  const meta = ACTION_META[log.action] ?? {
    label: log.action, tone: "slate" as Tone, group: "Other", icon: ScrollText,
  };
  const Icon = meta.icon;
  const changed = log.before !== undefined || log.after !== undefined;
  return (
    <div className="flex gap-3 px-5 py-3.5">
      <div className="mt-0.5 shrink-0 rounded-xl bg-slate-100 p-2 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="truncate text-sm font-semibold text-slate-800">{log.entity}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{log.summary}</p>
        {changed && (
          <p className="mt-1 font-mono text-[11px] text-slate-400">
            {log.before !== undefined && <span className="text-rose-500">{log.before || "—"}</span>}
            {log.before !== undefined && log.after !== undefined && " → "}
            {log.after !== undefined && <span className="text-emerald-600">{log.after || "—"}</span>}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-2">
          <Avatar name={log.actorName} size={24} />
          <span className="text-xs font-medium text-slate-600">{log.actorName}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">{fmt(log.at)}</p>
      </div>
    </div>
  );
}
