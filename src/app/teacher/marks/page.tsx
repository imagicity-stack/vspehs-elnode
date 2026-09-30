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
import { Card, CardHeader, Badge, EmptyState, Loading, Progress } from "@/components/ui";
import { MarksSheet } from "@/components/MarksSheet";
import { formatDate, formatTime, todayISO } from "@/lib/utils";
import { SubjectExam } from "@/lib/types";
import {
  SHEET_STATUS_META, canMark, isSheetLocked, sheetFor, sheetProgress, teacherScope,
} from "@/lib/exams";
import { Pencil, Lock, AlertTriangle, CalendarDays } from "lucide-react";

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
