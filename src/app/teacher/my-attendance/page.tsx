"use client";

// ─────────────────────────────────────────────────────────────
// Teacher → My Attendance
// ─────────────────────────────────────────────────────────────
// Staff self-service: clock in / clock out, and a month view of your own
// register. The punch decides punctuality, so the time shown is the time filed.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { useTeacher } from "../teacher-context";
import { useData } from "@/lib/store";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Badge, EmptyState, Stat, Progress } from "@/components/ui";
import { AttendanceStatus } from "@/lib/types";
import { formatDate, formatTime, nowHHMM, todayISO } from "@/lib/utils";
import {
  WORK_DAY, formatDuration, isWeekend, leaveOnDate, monthDates,
  staffAttendanceSummary, statusFromCheckIn, workedMinutes,
} from "@/lib/analytics";
import {
  CalendarCheck, CheckCircle2, Clock, LogIn, LogOut, Hourglass, CircleSlash, Timer,
} from "lucide-react";

const STATUS_META: Record<AttendanceStatus, { label: string; tone: "green" | "amber" | "sky" | "red"; cell: string }> = {
  present: { label: "Present", tone: "green", cell: "bg-emerald-100 text-emerald-700" },
  late: { label: "Late", tone: "amber", cell: "bg-amber-100 text-amber-700" },
  "half-day": { label: "Half day", tone: "sky", cell: "bg-sky-100 text-sky-700" },
  absent: { label: "Absent", tone: "red", cell: "bg-rose-100 text-rose-700" },
};

export default function MyAttendance() {
  const { staff } = useTeacher();
  const data = useData();
  const today = todayISO();

  // Live clock so the punch buttons show the time they will actually file.
  const [clock, setClock] = useState(() => nowHHMM());
  useEffect(() => {
    const t = setInterval(() => setClock(nowHHMM()), 15_000);
    return () => clearInterval(t);
  }, []);

  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [year, monthIndex] = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [y, m - 1];
  }, [month]);
  const dates = useMemo(() => monthDates(year, monthIndex), [year, monthIndex]);

  if (!staff) {
    return (
      <EmptyState
        title="No staff profile linked to this login"
        hint="Ask an administrator to link your account from Admin → Staff."
      />
    );
  }

  const todayRec = data.staffAttendance.find((a) => a.staffId === staff.id && a.date === today);
  const leaveToday = leaveOnDate(data.leaveRequests, staff.id, today);
  const summary = staffAttendanceSummary(data.staffAttendance, staff.id, dates);
  const workedToday = todayRec ? workedMinutes(todayRec) : 0;
  const preview = statusFromCheckIn(clock);

  const punch = (kind: "in" | "out") => {
    const time = nowHHMM();
    data.punchStaff({ staffId: staff.id, date: today, kind, time });
    toast.success(
      kind === "in"
        ? `Checked in at ${formatTime(time)}${statusFromCheckIn(time)?.status === "late" ? " — marked late" : ""}`
        : `Checked out at ${formatTime(time)}`,
    );
  };

  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  // Pad the calendar so the 1st lands under its weekday column.
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Working day {formatTime(WORK_DAY.start)} to {formatTime(WORK_DAY.end)}
          {WORK_DAY.grace > 0 && ` · ${WORK_DAY.grace} min grace`}.
        </p>
      </div>

      {/* Punch card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {new Date(`${today}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">{formatTime(clock)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {todayRec ? (
                <Badge tone={STATUS_META[todayRec.status].tone}>{STATUS_META[todayRec.status].label}</Badge>
              ) : (
                <Badge tone="slate">Not marked yet</Badge>
              )}
              {leaveToday && <Badge tone="amber">Approved {leaveToday.type} leave</Badge>}
              {todayRec?.checkIn && <span className="text-xs text-slate-400">In {formatTime(todayRec.checkIn)}</span>}
              {todayRec?.checkOut && <span className="text-xs text-slate-400">Out {formatTime(todayRec.checkOut)}</span>}
              {workedToday > 0 && <span className="text-xs font-medium text-slate-500">{formatDuration(workedToday)} on site</span>}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {!todayRec?.checkIn ? (
              <>
                <button onClick={() => punch("in")} className="btn-primary px-6 py-3">
                  <LogIn className="h-4 w-4" /> Check in
                </button>
                {preview?.status === "late" && (
                  <p className="text-xs font-medium text-amber-600">
                    {preview.lateBy} min past {formatTime(WORK_DAY.start)} — this will file as late.
                  </p>
                )}
              </>
            ) : !todayRec?.checkOut ? (
              <button onClick={() => punch("out")} className="btn-ghost px-6 py-3">
                <LogOut className="h-4 w-4" /> Check out
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Day complete
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Attendance" value={`${summary.rate}%`} tone="brand" icon={<CalendarCheck className="h-5 w-5" />} hint={`${summary.marked} days marked`} />
        <Stat label="On time" value={`${summary.punctuality}%`} tone="green" icon={<CheckCircle2 className="h-5 w-5" />} hint={`${summary.late} late day${summary.late === 1 ? "" : "s"}`} />
        <Stat label="Absent" value={summary.absent} tone="red" icon={<CircleSlash className="h-5 w-5" />} hint={monthLabel} />
        <Stat label="Avg hours" value={formatDuration(summary.avgMinutes)} tone="violet" icon={<Hourglass className="h-5 w-5" />} hint="Per day with punches" />
      </div>

      <Card>
        <CardHeader
          title={`${monthLabel} calendar`}
          subtitle="Your marked register"
          icon={<Timer className="h-5 w-5" />}
          action={
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-40 py-1.5 text-sm" />
          }
        />
        <div className="p-4">
          <div className="mx-auto grid max-w-xl grid-cols-7 gap-1.5">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{d}</div>
            ))}
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
            {dates.map((d) => {
              const rec = data.staffAttendance.find((a) => a.staffId === staff.id && a.date === d);
              const leave = leaveOnDate(data.leaveRequests, staff.id, d);
              const weekend = isWeekend(d);
              return (
                <div
                  key={d}
                  title={`${formatDate(d)}${rec ? ` · ${STATUS_META[rec.status].label}` : ""}${rec?.checkIn ? ` · in ${formatTime(rec.checkIn)}` : ""}`}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold ${
                    rec
                      ? STATUS_META[rec.status].cell
                      : leave
                        ? "border border-dashed border-amber-300 text-amber-500"
                        : weekend
                          ? "bg-slate-50 text-slate-300"
                          : "border border-dashed border-slate-200 text-slate-300"
                  } ${d === today ? "ring-2 ring-brand-400" : ""}`}
                >
                  {Number(d.slice(8))}
                  {rec?.checkIn && <span className="mt-0.5 text-[9px] font-medium opacity-70">{rec.checkIn}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent days" subtitle="Latest 10 marked days" icon={<Clock className="h-5 w-5" />} />
        <div className="divide-y divide-slate-100">
          {(() => {
            const recent = data.staffAttendance
              .filter((a) => a.staffId === staff.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 10);
            if (recent.length === 0) {
              return <div className="p-5"><EmptyState title="Nothing marked yet" hint="Check in above to start your register." /></div>;
            }
            return recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatDate(r.date, { weekday: "short", day: "numeric", month: "short" })}
                    {r.date === today && <span className="ml-2 text-xs font-medium text-brand-600">Today</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.checkIn ? `In ${formatTime(r.checkIn)}` : "No check-in"}
                    {r.checkOut ? ` · Out ${formatTime(r.checkOut)}` : ""}
                    {workedMinutes(r) > 0 ? ` · ${formatDuration(workedMinutes(r))}` : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.status === "late" && r.lateBy ? (
                    <span className="text-xs font-medium text-amber-600">+{r.lateBy} min</span>
                  ) : null}
                  <Badge tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</Badge>
                </div>
              </div>
            ));
          })()}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-slate-700">This month at a glance</p>
        <div className="mt-3 space-y-3">
          {([
            ["Present", summary.present, "green"],
            ["Late", summary.late, "amber"],
            ["Half day", summary.half, "sky"],
            ["Absent", summary.absent, "red"],
          ] as const).map(([label, value, tone]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-20 text-xs font-medium text-slate-500">{label}</span>
              <div className="flex-1"><Progress value={summary.marked ? (value / summary.marked) * 100 : 0} tone={tone} /></div>
              <span className="w-8 text-right text-xs font-semibold text-slate-700">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
