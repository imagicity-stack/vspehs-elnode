"use client";

// ─────────────────────────────────────────────────────────────
// Teacher → Result Analytics
// ─────────────────────────────────────────────────────────────
// Performance for the papers this teacher marked, once the class's result has
// been published. Scoped to their own allocation — nothing else is visible.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Stat, EmptyState, Loading, Progress } from "@/components/ui";
import { Bars } from "@/components/charts";
import { formatDate } from "@/lib/utils";
import {
  canMark, isClassPublished, scaleForExam, sheetFor, subjectAnalytics, teacherScope,
} from "@/lib/exams";
import {
  TrendingUp, Users, Award, AlertTriangle, CheckCircle2, CircleSlash, Target, Lock,
} from "lucide-react";

export default function TeacherAnalytics() {
  const { user } = useAuth();
  const data = useData();
  const [groupId, setGroupId] = useState<string>("");

  const me = data.staff.find((s) => s.id === user?.staffId);
  const scope = useMemo(
    () => teacherScope(me?.id ?? "", data.teacherAssignments),
    [me?.id, data.teacherAssignments],
  );

  // Papers this teacher marked, in classes whose result is live.
  const myPapers = useMemo(() => {
    if (!me) return [];
    return data.subjectExams.filter((e) => {
      if (!canMark(e, me.id, scope)) return false;
      const group = data.examGroups.find((g) => g.id === e.groupId);
      return isClassPublished(group, e.classId);
    });
  }, [me, data.subjectExams, data.examGroups, scope]);

  const groups = useMemo(() => {
    const ids = Array.from(new Set(myPapers.map((p) => p.groupId)));
    return ids
      .map((id) => data.examGroups.find((g) => g.id === id))
      .filter((g): g is NonNullable<typeof g> => !!g)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [myPapers, data.examGroups]);

  const activeGroupId = groupId || groups[0]?.id || "";
  const papers = myPapers
    .filter((p) => p.groupId === activeGroupId)
    .sort((a, b) => a.classId.localeCompare(b.classId));

  if (!me) {
    return <EmptyState title="No staff profile linked to this login" hint="Ask an administrator to link your account." />;
  }

  // Everything this teacher marked, published or not — powers the "waiting" note.
  const markedNotPublished = data.subjectExams.filter((e) => {
    if (!canMark(e, me.id, scope)) return false;
    const group = data.examGroups.find((g) => g.id === e.groupId);
    const sheet = sheetFor(e.id, data.examMarks);
    return sheet?.status === "submitted" && !isClassPublished(group, e.classId);
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Result Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            How your classes performed, once results are published.
          </p>
        </div>
        {groups.length > 0 && (
          <select value={activeGroupId} onChange={(e) => setGroupId(e.target.value)} className="input sm:w-64">
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </div>

      {data.loading && data.subjectExams.length === 0 ? (
        <Card><Loading label="Loading results…" /></Card>
      ) : papers.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Lock className="h-8 w-8" />}
            title="No published results yet"
            hint={
              markedNotPublished > 0
                ? `You've submitted ${markedNotPublished} paper${markedNotPublished === 1 ? "" : "s"}. Analytics unlock once the examination office publishes the class result.`
                : "Analytics appear here after you submit marks and the result is published."
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {papers.map((exam) => {
            const cls = data.classes.find((c) => c.id === exam.classId);
            const subject = data.subjects.find((s) => s.id === exam.subjectId);
            const group = data.examGroups.find((g) => g.id === exam.groupId);
            const students = data.students.filter((s) => s.classId === exam.classId && s.status === "active");
            const sheet = sheetFor(exam.id, data.examMarks);
            const scale = scaleForExam(exam, group, data.gradeScales);
            const a = subjectAnalytics(exam, sheet, students, scale);

            return (
              <Card key={exam.id}>
                <CardHeader
                  title={`${cls?.name} · ${subject?.name}`}
                  subtitle={`${group?.name} · ${formatDate(exam.date)} · out of ${exam.maxMarks}`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  action={<Badge tone={a.passPercent >= 90 ? "green" : a.passPercent >= 70 ? "amber" : "red"}>{a.passPercent}% pass</Badge>}
                />

                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat label="Students" value={students.length} tone="brand" icon={<Users className="h-5 w-5" />} hint={`${a.appeared} appeared`} />
                  <Stat label="Class average" value={a.average} tone="violet" icon={<Target className="h-5 w-5" />} hint={`out of ${exam.maxMarks}`} />
                  <Stat label="Highest" value={a.highest} tone="green" icon={<Award className="h-5 w-5" />} hint={`Lowest ${a.lowest}`} />
                  <Stat
                    label="Passed"
                    value={`${a.passed}/${a.appeared}`}
                    tone={a.failed === 0 ? "green" : "amber"}
                    icon={a.failed === 0 ? <CheckCircle2 className="h-5 w-5" /> : <CircleSlash className="h-5 w-5" />}
                    hint={`${a.failed} below ${exam.passingMarks}`}
                  />
                </div>

                <div className="grid gap-6 border-t border-slate-100 p-5 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Grade distribution</p>
                    {a.distribution.length === 0 || a.appeared === 0 ? (
                      <p className="text-sm text-slate-400">No grade scale attached to this paper.</p>
                    ) : (
                      <Bars
                        data={a.distribution.map((d) => ({ label: d.grade, Students: d.count }))}
                        keys={["Students"]}
                        height={200}
                      />
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Grade breakdown</p>
                    {a.distribution.length === 0 ? (
                      <p className="text-sm text-slate-400">—</p>
                    ) : (
                      <div className="space-y-2">
                        {a.distribution.map((d) => (
                          <div key={d.grade} className="flex items-center gap-3">
                            <span className="w-10 shrink-0 rounded-lg bg-slate-100 py-0.5 text-center text-xs font-bold text-slate-600">
                              {d.grade}
                            </span>
                            <div className="flex-1">
                              <Progress value={a.appeared ? (d.count / a.appeared) * 100 : 0} tone="brand" />
                            </div>
                            <span className="w-8 text-right text-xs font-semibold text-slate-600">{d.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {a.failed > 0 && (
                  <div className="flex items-start gap-2 border-t border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {a.failed} student{a.failed === 1 ? "" : "s"} scored below the passing mark of {exam.passingMarks}.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
