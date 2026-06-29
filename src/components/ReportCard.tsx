"use client";

import { Student, Exam, ExamResult, SchoolClass, Grade } from "@/lib/types";
import { fullName, ageFromDob, formatDate } from "@/lib/utils";
import { GraduationCap, Star } from "lucide-react";

const gradeColor: Record<Grade, string> = {
  "A+": "bg-emerald-100 text-emerald-700",
  A: "bg-sky-100 text-sky-700",
  B: "bg-amber-100 text-amber-700",
  C: "bg-orange-100 text-orange-700",
  "Needs Support": "bg-rose-100 text-rose-700",
};

const gradeLabel: Record<Grade, string> = {
  "A+": "Outstanding",
  A: "Excellent",
  B: "Good Progress",
  C: "Developing",
  "Needs Support": "Needs Support",
};

export function ReportCard({
  student, cls, exam, result, attendanceRate,
}: {
  student: Student; cls?: SchoolClass; exam: Exam; result?: ExamResult; attendanceRate: number;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-card print:border-0 print:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-brand-600 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">El-Node Pre-Primary</h1>
            <p className="text-sm text-slate-500">Progress Report · {exam.name}</p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Academic Year</p>
          <p className="font-semibold text-slate-700">2025–2026</p>
        </div>
      </div>

      {/* Student info */}
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <Info label="Student" value={fullName(student)} />
        <Info label="Class" value={cls?.name ?? "—"} />
        <Info label="Roll No" value={`#${student.rollNo}`} />
        <Info label="Admission" value={student.admissionNo} />
        <Info label="Date of Birth" value={formatDate(student.dob)} />
        <Info label="Age" value={ageFromDob(student.dob)} />
        <Info label="Attendance" value={`${attendanceRate}%`} />
        <Info label="Assessed On" value={formatDate(exam.date)} />
      </div>

      {/* Skills */}
      <h2 className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        <Star className="h-4 w-4 text-amber-500" /> Skill Assessment
      </h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Area of Development</th>
              <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Grade</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {exam.skills.map((skill) => {
              const g = (result?.grades[skill] ?? "B") as Grade;
              return (
                <tr key={skill}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{skill}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex min-w-[2.5rem] justify-center rounded-lg px-2 py-1 text-xs font-bold ${gradeColor[g]}`}>{g}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{gradeLabel[g]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Remark */}
      <div className="mt-5 rounded-xl bg-brand-50/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Class Teacher&apos;s Remark</p>
        <p className="mt-1 text-sm italic text-slate-700">
          &ldquo;{result?.remark ?? "A wonderful term of growth and curiosity."}&rdquo;
        </p>
      </div>

      {/* Grade legend */}
      <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
        {(Object.keys(gradeLabel) as Grade[]).map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded ${gradeColor[g]}`} /> {g} — {gradeLabel[g]}
          </span>
        ))}
      </div>

      {/* Signatures */}
      <div className="mt-10 flex justify-between text-sm">
        <div className="text-center">
          <div className="mb-1 h-px w-32 bg-slate-300" />
          <p className="text-slate-500">Class Teacher</p>
        </div>
        <div className="text-center">
          <div className="mb-1 h-px w-32 bg-slate-300" />
          <p className="text-slate-500">Principal</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}
