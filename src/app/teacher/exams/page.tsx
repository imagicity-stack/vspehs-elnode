"use client";

import { useState } from "react";
import { useTeacher, ClassSwitcher } from "../teacher-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Avatar, Badge, EmptyState } from "@/components/ui";
import { fullName, formatDate } from "@/lib/utils";
import { Grade } from "@/lib/types";
import { Star, Save, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const GRADES: Grade[] = ["A+", "A", "B", "C", "Needs Support"];
const gradeTone = (g: Grade) =>
  g === "A+" ? "border-emerald-300 bg-emerald-50 text-emerald-700"
  : g === "A" ? "border-sky-300 bg-sky-50 text-sky-700"
  : g === "B" ? "border-amber-300 bg-amber-50 text-amber-700"
  : g === "C" ? "border-orange-300 bg-orange-50 text-orange-700"
  : "border-rose-300 bg-rose-50 text-rose-700";

export default function TeacherExams() {
  const { staff, activeClass } = useTeacher();
  const data = useData();
  const [savedId, setSavedId] = useState<string | null>(null);

  if (!activeClass) return <EmptyState title="No class assigned." />;
  const exam = data.exams.find((e) => e.classId === activeClass.id);
  const classStudents = data.students.filter((s) => s.classId === activeClass.id);

  if (!exam) return <EmptyState icon={<Star className="h-8 w-8" />} title="No assessment scheduled for this class" />;

  const setGrade = (studentId: string, skill: string, grade: Grade) => {
    const existing = data.examResults.find((r) => r.examId === exam.id && r.studentId === studentId);
    const grades = { ...(existing?.grades ?? {}), [skill]: grade };
    data.saveExamResult({
      id: existing?.id ?? `res-${studentId}`, examId: exam.id, studentId, grades,
      remark: existing?.remark ?? "A wonderful term of growth and curiosity.",
      teacherId: staff?.id ?? activeClass.classTeacherId,
    });
    setSavedId(studentId);
    setTimeout(() => setSavedId(null), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Skill Assessment</h1>
          <p className="mt-1 text-sm text-slate-500">{exam.name} · {activeClass.name} · {formatDate(exam.date)}</p>
        </div>
        <ClassSwitcher />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Badge tone={exam.published ? "green" : "amber"}>{exam.published ? "Published" : "Draft"}</Badge>
          <span className="text-sm text-slate-500">{exam.published ? "Parents can download report cards." : "Hidden from parents until published."}</span>
        </div>
        <button
          onClick={() => data.setExamPublished(exam.id, !exam.published)}
          className={exam.published ? "btn-ghost text-sm" : "btn-primary text-sm"}
        >
          {exam.published ? <><EyeOff className="h-4 w-4" /> Unpublish</> : <><Eye className="h-4 w-4" /> Publish to parents</>}
        </button>
      </div>

      <div className="space-y-4">
        {classStudents.map((s) => {
          const result = data.examResults.find((r) => r.examId === exam.id && r.studentId === s.id);
          return (
            <Card key={s.id} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={fullName(s)} src={s.photoUrl} size={40} />
                  <div>
                    <p className="font-semibold text-slate-900">{fullName(s)}</p>
                    <p className="text-xs text-slate-400">Roll #{s.rollNo}</p>
                  </div>
                </div>
                {savedId === s.id && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {exam.skills.map((skill) => {
                  const current = (result?.grades[skill] ?? "B") as Grade;
                  return (
                    <div key={skill}>
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">{skill}</p>
                      <div className="flex flex-wrap gap-1">
                        {GRADES.map((g) => (
                          <button
                            key={g}
                            onClick={() => setGrade(s.id, skill, g)}
                            className={`rounded-lg border px-2 py-1 text-xs font-bold transition ${current === g ? gradeTone(g) : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                          >
                            {g === "Needs Support" ? "NS" : g}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
