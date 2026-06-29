"use client";

import { useChild, ChildSwitcher } from "../child-context";
import { useData } from "@/lib/store";
import { ReportCard } from "@/components/ReportCard";
import { EmptyState } from "@/components/ui";
import { studentAttendanceRate } from "@/lib/analytics";
import { Download, FileText, Lock } from "lucide-react";

export default function ParentReportCard() {
  const { child } = useChild();
  const data = useData();
  if (!child) return <EmptyState title="No child linked." />;

  const cls = data.classes.find((c) => c.id === child.classId);
  const exam = data.exams.find((e) => e.classId === child.classId);
  const result = exam ? data.examResults.find((r) => r.examId === exam.id && r.studentId === child.id) : undefined;
  const att = studentAttendanceRate(data.attendance, child.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Report Card</h1>
          <p className="mt-1 text-sm text-slate-500">Download {child.firstName}&apos;s progress report.</p>
        </div>
        <div className="flex items-center gap-3">
          <ChildSwitcher />
          {exam?.published && (
            <button onClick={() => window.print()} className="btn-primary">
              <Download className="h-4 w-4" /> Download
            </button>
          )}
        </div>
      </div>

      {!exam ? (
        <EmptyState icon={<FileText className="h-8 w-8" />} title="No report available yet" />
      ) : !exam.published ? (
        <EmptyState icon={<Lock className="h-8 w-8" />} title="Report card not published yet" hint="It will appear here once your teacher publishes the term report." />
      ) : (
        <ReportCard student={child} cls={cls} exam={exam} result={result} attendanceRate={att.rate} />
      )}
    </div>
  );
}
