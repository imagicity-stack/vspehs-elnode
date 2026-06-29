"use client";

import { useChild, ChildSwitcher } from "../child-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Stat, EmptyState, Table, Th, Td } from "@/components/ui";
import { studentAttendanceRate } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";
import { CalendarCheck, Clock, CircleSlash, CheckCircle2 } from "lucide-react";
import { AttendanceStatus } from "@/lib/types";

const statusTone: Record<AttendanceStatus, "green" | "amber" | "red" | "sky"> = {
  present: "green", late: "amber", absent: "red", "half-day": "sky",
};

export default function ParentAttendance() {
  const { child } = useChild();
  const { attendance } = useData();
  if (!child) return <EmptyState title="No child linked." />;

  const mine = attendance
    .filter((a) => a.studentId === child.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const att = studentAttendanceRate(attendance, child.id);
  const present = mine.filter((m) => m.status === "present").length;
  const late = mine.filter((m) => m.status === "late").length;
  const absent = mine.filter((m) => m.status === "absent").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">{child.firstName}&apos;s daily attendance record.</p>
        </div>
        <ChildSwitcher />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Attendance Rate" value={`${att.rate}%`} tone="brand" icon={<CalendarCheck className="h-5 w-5" />} />
        <Stat label="Present" value={present} tone="green" icon={<CheckCircle2 className="h-5 w-5" />} />
        <Stat label="Late" value={late} tone="amber" icon={<Clock className="h-5 w-5" />} />
        <Stat label="Absent" value={absent} tone="red" icon={<CircleSlash className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader title="Daily Record" subtitle="Most recent first" icon={<CalendarCheck className="h-5 w-5" />} />
        {mine.length === 0 ? (
          <div className="p-5"><EmptyState title="No attendance recorded yet." /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Date</Th><Th>Day</Th><Th>Status</Th><Th>Note</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mine.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">{formatDate(m.date)}</Td>
                  <Td>{new Date(m.date).toLocaleDateString("en-IN", { weekday: "long" })}</Td>
                  <Td>
                    <Badge tone={statusTone[m.status]}>
                      {m.status === "present" && "Present"}
                      {m.status === "late" && `Late${m.lateBy ? ` (${m.lateBy}m)` : ""}`}
                      {m.status === "absent" && "Absent"}
                      {m.status === "half-day" && "Half day"}
                    </Badge>
                  </Td>
                  <Td className="text-slate-500">{m.note ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
