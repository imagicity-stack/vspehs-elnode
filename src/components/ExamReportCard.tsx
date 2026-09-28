"use client";

// ─────────────────────────────────────────────────────────────
// Examination report card (on screen)
// ─────────────────────────────────────────────────────────────
// Renders a published result snapshot. Every value comes from the snapshot, so
// this shows exactly what the PDF will — and what the card said when it was
// issued, whatever has changed since.
// ─────────────────────────────────────────────────────────────

import { StudentExamResult } from "@/lib/types";
import {
  BRAND_MAROON, SCHOOL_LOCATION, SCHOOL_NAME, SCHOOL_TAGLINE, SCHOOL_WEBSITE,
} from "@/lib/branding";
import { formatDate } from "@/lib/utils";
import { MARK_STATUS_META } from "@/lib/exams";
import { SchoolCrest } from "@/components/ui";
import { ShieldCheck } from "lucide-react";

export function ExamReportCard({ result }: { result: StudentExamResult }) {
  const r = result;
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-card print:border-0 print:shadow-none">
      {/* Masthead — mirrors the printed card */}
      <div className="border-b-2 pb-4 text-center" style={{ borderColor: BRAND_MAROON }}>
        <SchoolCrest size={56} className="mx-auto" />
        <h1
          className="mt-2 text-xl font-bold uppercase tracking-[0.08em] sm:text-2xl"
          style={{ color: BRAND_MAROON, fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {SCHOOL_NAME}
        </h1>
        <p className="mt-0.5 text-xs uppercase tracking-widest text-slate-500">
          {SCHOOL_LOCATION} · {SCHOOL_WEBSITE}
        </p>
        <p className="mt-0.5 text-xs italic text-amber-700">{SCHOOL_TAGLINE}</p>
      </div>

      {/* Title band */}
      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-white"
        style={{ background: BRAND_MAROON }}
      >
        <p className="text-sm font-bold uppercase tracking-[0.12em]">{r.groupName}</p>
        <p className="text-xs font-medium">Session {r.sessionName}</p>
      </div>

      {/* Student */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
        {r.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.photoUrl} alt={r.studentName} className="h-24 w-20 shrink-0 rounded-xl border border-slate-200 object-cover" />
        )}
        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Info label="Student" value={r.studentName} />
          <Info label="Class" value={r.className} />
          <Info label="Roll No" value={`#${r.rollNo}`} />
          <Info label="Admission No" value={r.admissionNo} />
          <Info label="Father's Name" value={r.fatherName || "—"} />
          <Info label="Mother's Name" value={r.motherName || "—"} />
        </div>
      </div>

      {/* Marks */}
      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Academic Performance</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Subject</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Max</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Obtained</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">%</th>
              <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Grade</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {r.lines.map((l) => {
              const meta = MARK_STATUS_META[l.status];
              return (
                <tr key={l.subjectId}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{l.subjectName}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{l.maxMarks}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${l.passed ? "text-slate-800" : "text-rose-600"}`}>
                    {l.obtained === null ? meta.short : l.obtained}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{l.obtained === null ? "—" : `${l.percent}%`}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex min-w-[2.25rem] justify-center rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                      {l.grade}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{l.remarks || (meta.numeric ? "" : meta.label)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 text-center sm:grid-cols-4 lg:grid-cols-5">
        <Summary label="Total" value={`${r.totalObtained}/${r.totalMax}`} />
        <Summary label="Percentage" value={`${r.percentage}%`} />
        <Summary label="Overall Grade" value={r.overallGrade} />
        {r.rank !== undefined && <Summary label="Class Rank" value={`#${r.rank}`} />}
        <Summary label="Result" value={r.passed ? "PASS" : "FAIL"} tone={r.passed ? "text-emerald-600" : "text-rose-600"} />
      </div>

      {typeof r.attendanceRate === "number" && (
        <p className="mt-3 text-sm text-slate-500">
          Attendance: <span className="font-semibold text-slate-700">{r.attendanceRate}%</span>
          {r.failedCount > 0 && (
            <span className="ml-3 text-rose-600">
              {r.failedCount} subject{r.failedCount === 1 ? "" : "s"} below the passing mark
            </span>
          )}
        </p>
      )}

      {/* Remarks */}
      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Class Teacher&apos;s Remark</p>
        <p className="mt-1 text-sm italic text-slate-700">
          &ldquo;{r.classTeacherRemark || (r.passed
            ? "A consistent and sincere performance this term. Keep it up."
            : "Needs focused support in the subjects below the pass mark.")}&rdquo;
        </p>
      </div>
      {r.principalRemark && (
        <div className="mt-3 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Principal&apos;s Remark</p>
          <p className="mt-1 text-sm italic text-slate-700">&ldquo;{r.principalRemark}&rdquo;</p>
        </div>
      )}

      {/* Grade legend */}
      {r.gradeScaleSnapshot.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{r.gradeScaleName}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {[...r.gradeScaleSnapshot].sort((a, b) => b.minPercent - a.minPercent).map((b) => (
              <span key={b.grade}>
                <span className="font-semibold text-slate-700">{b.grade}</span> {b.minPercent}–{b.maxPercent}%
                {b.remark ? ` · ${b.remark}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-10 flex flex-wrap justify-between gap-6 text-sm">
        {["Class Teacher", "Examination In-charge", "Principal"].map((label) => (
          <div key={label} className="text-center">
            <div className="mb-1 h-px w-32 bg-slate-300" />
            <p className="text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Verification */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verification ID <span className="font-mono font-semibold text-slate-600">{r.verificationId}</span>
        </span>
        <span>Published {formatDate(r.publishedAt)} · {SCHOOL_WEBSITE}</span>
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

function Summary({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}
