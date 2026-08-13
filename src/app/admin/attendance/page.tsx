"use client";

// ─────────────────────────────────────────────────────────────
// Admin → Staff Attendance
// ─────────────────────────────────────────────────────────────
// Three views over one register:
//   • Today    — mark the day, with punch times and live counts
//   • Register — a month-at-a-glance matrix; click any cell to correct it
//   • Insights — trends, punctuality and a per-person summary
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Avatar, Badge, Stat, EmptyState, Loading, Table, Th, Td, Progress } from "@/components/ui";
import { Bars, Donut } from "@/components/charts";
import { AttendanceStatus, Staff, StaffRole } from "@/lib/types";
import { formatDate, formatTime, todayISO } from "@/lib/utils";
import {
  WORK_DAY, formatDuration, isWeekend, leaveOnDate, monthDates, staffAttendanceBoard,
  staffAttendanceForDate, staffAttendanceSummary, staffAttendanceTrend, statusFromCheckIn, workedMinutes,
} from "@/lib/analytics";
import {
  CalendarCheck, CheckCircle2, Clock, CircleSlash, PieChart, Save, Search, Printer,
  Download, Users, Timer, TrendingUp, CalendarOff, RotateCcw, AlertTriangle, Hourglass,
} from "lucide-react";

// ── Status vocabulary ─────────────────────────────────────────
const STATUS_META: Record<AttendanceStatus, {
  label: string; letter: string; tone: "green" | "amber" | "sky" | "red"; solid: string; cell: string;
}> = {
  present: { label: "Present", letter: "P", tone: "green", solid: "bg-emerald-500", cell: "bg-emerald-100 text-emerald-700" },
  late: { label: "Late", letter: "L", tone: "amber", solid: "bg-amber-500", cell: "bg-amber-100 text-amber-700" },
  "half-day": { label: "Half day", letter: "H", tone: "sky", solid: "bg-sky-500", cell: "bg-sky-100 text-sky-700" },
  absent: { label: "Absent", letter: "A", tone: "red", solid: "bg-rose-500", cell: "bg-rose-100 text-rose-700" },
};
const STATUS_ORDER: AttendanceStatus[] = ["present", "late", "half-day", "absent"];

const roleTone: Record<StaffRole, "brand" | "amber" | "violet" | "slate"> = {
  teacher: "brand", accountant: "amber", superadmin: "violet", helper: "slate",
};

// ── CSV ───────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((cell) => {
      const v = String(cell ?? "");
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const monthKey = (iso: string) => iso.slice(0, 7);

export default function AdminStaffAttendance() {
  const { user } = useAuth();
  const data = useData();
  const today = todayISO();

  const [tab, setTab] = useState<"today" | "register" | "insights">("today");
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(() => monthKey(today));
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | StaffRole>("all");

  // Inactive staff have no register — they're off the payroll, not absent.
  const roster = useMemo(
    () => data.staff.filter((s) => s.status !== "inactive").sort((a, b) => a.name.localeCompare(b.name)),
    [data.staff],
  );
  const filtered = useMemo(
    () => roster
      .filter((s) => role === "all" || s.role === role)
      .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.staffCode.toLowerCase().includes(q.toLowerCase())),
    [roster, role, q],
  );

  const [year, monthIndex] = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [y, m - 1];
  }, [month]);
  const dates = useMemo(() => monthDates(year, monthIndex), [year, monthIndex]);
  const workingDates = useMemo(() => dates.filter((d) => !isWeekend(d) && d <= today), [dates, today]);

  // Scoped to the current roster: a record left behind by an inactive or
  // deleted staff member must not count towards today's headcount.
  const rosterRecords = useMemo(() => {
    const ids = new Set(roster.map((s) => s.id));
    return data.staffAttendance.filter((a) => ids.has(a.staffId));
  }, [roster, data.staffAttendance]);

  const todayStats = staffAttendanceForDate(rosterRecords, today, roster.length);
  const onLeaveToday = roster.filter((s) => leaveOnDate(data.leaveRequests, s.id, today)).length;
  const monthBoard = useMemo(
    () => staffAttendanceBoard(roster, rosterRecords, workingDates),
    [roster, rosterRecords, workingDates],
  );
  const monthRate = monthBoard.length
    ? Math.round(monthBoard.reduce((s, r) => s + r.rate, 0) / monthBoard.length)
    : 0;
  const avgHours = (() => {
    const withHours = monthBoard.filter((r) => r.avgMinutes > 0);
    return withHours.length
      ? Math.round(withHours.reduce((s, r) => s + r.avgMinutes, 0) / withHours.length)
      : 0;
  })();

  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 no-print sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Daily register, monthly view and punctuality — working day {formatTime(WORK_DAY.start)} to {formatTime(WORK_DAY.end)}
            {WORK_DAY.grace > 0 && ` (${WORK_DAY.grace} min grace)`}.
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-card">
          {([
            ["today", "Today", CalendarCheck],
            ["register", "Register", CalendarOff],
            ["insights", "Insights", TrendingUp],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === key ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Headline numbers — always today, whichever view is open */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="In today" tone="green" icon={<CheckCircle2 className="h-5 w-5" />}
          value={`${todayStats.inAttendance}/${roster.length}`}
          hint={todayStats.unmarked > 0 ? `${todayStats.unmarked} not marked yet` : "Register complete"}
        />
        <Stat label="Late today" value={todayStats.late} tone="amber" icon={<Clock className="h-5 w-5" />} hint="Past the grace period" />
        <Stat label="Absent today" value={todayStats.absent} tone="red" icon={<CircleSlash className="h-5 w-5" />} hint={`${onLeaveToday} on approved leave`} />
        <Stat label={`${monthLabel} rate`} value={`${monthRate}%`} tone="brand" icon={<PieChart className="h-5 w-5" />} hint={`${workingDates.length} working days`} />
        <Stat label="Avg hours / day" value={formatDuration(avgHours)} tone="violet" icon={<Hourglass className="h-5 w-5" />} hint="Across staff with punch times" />
      </div>

      {data.loading && data.staff.length === 0 ? (
        <Card><Loading label="Loading staff…" /></Card>
      ) : roster.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No active staff yet"
            hint="Add teachers and support staff from Admin → Staff to start marking attendance."
          />
        </Card>
      ) : (
        <>
          {/* Filters shared by every view */}
          <Card className="no-print">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {tab === "today" ? (
                  <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="input sm:w-44" />
                ) : (
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input sm:w-44" />
                )}
                <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="input capitalize sm:w-40">
                  <option value="all">All roles</option>
                  {(["teacher", "accountant", "helper", "superadmin"] as StaffRole[]).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff…" className="input pl-9 sm:w-60" />
              </div>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card className="p-8"><EmptyState icon={<Search className="h-8 w-8" />} title="No staff match this filter" /></Card>
          ) : tab === "today" ? (
            <DailyRegister staff={filtered} date={date} markedBy={user?.staffId ?? "admin"} />
          ) : tab === "register" ? (
            <MonthRegister staff={filtered} dates={dates} monthLabel={monthLabel} markedBy={user?.staffId ?? "admin"} />
          ) : (
            <Insights staff={filtered} workingDates={workingDates} monthLabel={monthLabel} />
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Today — the daily register
// ─────────────────────────────────────────────────────────────
interface Draft { status: AttendanceStatus; checkIn: string; checkOut: string }

function DailyRegister({ staff, date, markedBy }: { staff: Staff[]; date: string; markedBy: string }) {
  const data = useData();
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const stored = useMemo(
    () => data.staffAttendance.filter((a) => a.date === date),
    [data.staffAttendance, date],
  );
  // Rebuild the draft whenever the day, the roster or the stored register
  // changes — that keeps a late-arriving Firestore snapshot (or another
  // admin's save) from being overwritten by a stale form.
  const storedKey = useMemo(
    () => stored.map((a) => `${a.staffId}:${a.status}:${a.checkIn ?? ""}:${a.checkOut ?? ""}`).sort().join("|"),
    [stored],
  );
  const staffKey = staff.map((s) => s.id).join("|");

  // Saved register, or a sensible starting point: present by default, absent
  // for anyone already on approved leave that day.
  const buildDraft = useCallback(() => {
    const next: Record<string, Draft> = {};
    for (const s of staff) {
      const rec = stored.find((a) => a.staffId === s.id);
      const leave = leaveOnDate(data.leaveRequests, s.id, date);
      next[s.id] = rec
        ? { status: rec.status, checkIn: rec.checkIn ?? "", checkOut: rec.checkOut ?? "" }
        : { status: leave ? "absent" : "present", checkIn: "", checkOut: "" };
    }
    return next;
  }, [staff, stored, data.leaveRequests, date]);

  useEffect(() => {
    setDraft(buildDraft());
    // `savedAt` deliberately survives this: saving is itself what changes
    // `storedKey`, and clearing it here would wipe the confirmation instantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, staffKey, storedKey]);

  useEffect(() => setSavedAt(null), [date]);

  const setStatus = (id: string, status: AttendanceStatus) =>
    setDraft((d) => ({
      ...d,
      // An absence has no punch times — clearing them keeps the register honest.
      [id]: status === "absent"
        ? { status, checkIn: "", checkOut: "" }
        : { ...d[id], status },
    }));

  const setPunch = (id: string, kind: "checkIn" | "checkOut", value: string) =>
    setDraft((d) => {
      const cur = d[id];
      const next: Draft = { ...cur, [kind]: value };
      // A check-in decides punctuality, so derive it rather than trusting the
      // status that happened to be selected. Half-days are set deliberately.
      if (kind === "checkIn" && value && cur.status !== "half-day") {
        next.status = statusFromCheckIn(value)?.status ?? cur.status;
      }
      return { ...d, [id]: next };
    });

  const markAll = (status: AttendanceStatus) =>
    setDraft((d) => {
      const next: Record<string, Draft> = { ...d };
      for (const s of staff) next[s.id] = status === "absent"
        ? { status, checkIn: "", checkOut: "" }
        : { ...next[s.id], status };
      return next;
    });

  const reset = () => {
    setDraft(buildDraft());
    setSavedAt(null);
  };

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = staff.filter((m) => draft[m.id]?.status === s).length;
    return acc;
  }, {} as Record<AttendanceStatus, number>);

  const dirty = staff.some((s) => {
    const d = draft[s.id];
    if (!d) return false;
    const rec = stored.find((a) => a.staffId === s.id);
    if (!rec) return true;
    return rec.status !== d.status || (rec.checkIn ?? "") !== d.checkIn || (rec.checkOut ?? "") !== d.checkOut;
  });

  const save = () => {
    const records = staff
      .filter((s) => draft[s.id])
      .map((s) => {
        const d = draft[s.id];
        const leave = leaveOnDate(data.leaveRequests, s.id, date);
        const late = d.status === "late" ? statusFromCheckIn(d.checkIn) : null;
        return {
          staffId: s.id,
          date,
          status: d.status,
          checkIn: d.status === "absent" ? undefined : d.checkIn || undefined,
          checkOut: d.status === "absent" ? undefined : d.checkOut || undefined,
          lateBy: late?.lateBy,
          note: d.status === "absent" && leave ? `Approved ${leave.type} leave` : undefined,
          markedBy,
        };
      });
    data.markStaffAttendance(records);
    setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }));
    toast.success(`Attendance saved for ${records.length} staff · ${formatDate(date)}`);
  };

  return (
    <div className="space-y-4">
      {/* Sticky action bar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-card backdrop-blur no-print">
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <Badge key={s} tone={STATUS_META[s].tone}>{counts[s]} {STATUS_META[s].label.toLowerCase()}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => markAll("present")} className="btn-ghost text-xs">Mark all present</button>
          <button onClick={reset} className="btn-ghost text-xs" title="Discard unsaved changes">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button onClick={save} className="btn-primary text-xs">
            <Save className="h-3.5 w-3.5" /> {dirty || !savedAt ? "Save register" : `Saved ${savedAt}`}
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          title={formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          subtitle={`${staff.length} staff${isWeekend(date) ? " · weekend" : ""}`}
          icon={<CalendarCheck className="h-5 w-5" />}
          action={
            <button
              onClick={() => downloadCSV(
                `staff-attendance-${date}.csv`,
                [
                  ["Staff", "Code", "Role", "Status", "Check in", "Check out", "Hours"],
                  ...staff.map((s) => {
                    const d = draft[s.id];
                    return [
                      s.name, s.staffCode, s.role,
                      d ? STATUS_META[d.status].label : "—",
                      d?.checkIn || "", d?.checkOut || "",
                      d ? formatDuration(workedMinutes({ checkIn: d.checkIn, checkOut: d.checkOut })) : "",
                    ];
                  }),
                ],
              )}
              className="btn-ghost text-xs no-print"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          }
        />
        <div className="divide-y divide-slate-100">
          {staff.map((s) => {
            const d = draft[s.id];
            if (!d) return null;
            const leave = leaveOnDate(data.leaveRequests, s.id, date);
            const late = d.status === "late" ? statusFromCheckIn(d.checkIn) : null;
            const worked = workedMinutes({ checkIn: d.checkIn, checkOut: d.checkOut });
            const unmarked = !stored.some((a) => a.staffId === s.id);
            return (
              <div key={s.id} className="flex flex-col gap-3 px-5 py-3.5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={s.name} src={s.photoUrl} size={40} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="truncate">{s.name}</span>
                      <Badge tone={roleTone[s.role]}>{s.role}</Badge>
                      {unmarked && <span className="text-[11px] font-medium text-slate-400">not marked</span>}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {s.staffCode}
                      {leave && <span className="text-amber-600"> · approved {leave.type} leave</span>}
                      {late?.lateBy ? <span className="text-amber-600"> · {late.lateBy} min late</span> : null}
                      {worked > 0 && <span> · {formatDuration(worked)} on site</span>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time" value={d.checkIn} disabled={d.status === "absent"}
                      onChange={(e) => setPunch(s.id, "checkIn", e.target.value)}
                      className="input w-[104px] px-2 py-1.5 text-xs disabled:bg-slate-50 disabled:text-slate-300"
                      aria-label={`${s.name} check in`}
                    />
                    <span className="text-xs text-slate-300">→</span>
                    <input
                      type="time" value={d.checkOut} disabled={d.status === "absent"}
                      onChange={(e) => setPunch(s.id, "checkOut", e.target.value)}
                      className="input w-[104px] px-2 py-1.5 text-xs disabled:bg-slate-50 disabled:text-slate-300"
                      aria-label={`${s.name} check out`}
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {STATUS_ORDER.map((opt) => {
                      const active = d.status === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setStatus(s.id, opt)}
                          className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition ${
                            active
                              ? `${STATUS_META[opt].solid} border-transparent text-white`
                              : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {STATUS_META[opt].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Register — the month matrix
// ─────────────────────────────────────────────────────────────
function MonthRegister({
  staff, dates, monthLabel, markedBy,
}: { staff: Staff[]; dates: string[]; monthLabel: string; markedBy: string }) {
  const data = useData();
  const today = todayISO();

  const recordFor = (staffId: string, date: string) =>
    data.staffAttendance.find((a) => a.staffId === staffId && a.date === date);

  // Clicking a cell steps through the four statuses, keeping any punch times.
  // An unmarked cell has no status, so the "previous" is taken as absent and
  // the first click lands on present.
  const cycle = (staffId: string, date: string) => {
    if (date > today) return;
    const existing = recordFor(staffId, date);
    const from = existing?.status ?? "absent";
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(from) + 1) % STATUS_ORDER.length];
    data.markStaffAttendance([{
      staffId,
      date,
      status: next,
      checkIn: next === "absent" ? undefined : existing?.checkIn,
      checkOut: next === "absent" ? undefined : existing?.checkOut,
      note: existing?.note,
      lateBy: next === "late" ? statusFromCheckIn(existing?.checkIn)?.lateBy : undefined,
      markedBy,
    }]);
  };

  const exportCSV = () => downloadCSV(
    `staff-register-${dates[0]?.slice(0, 7) ?? "month"}.csv`,
    [
      ["Staff", "Code", ...dates.map((d) => d.slice(8)), "Present", "Late", "Half day", "Absent", "Rate %"],
      ...staff.map((s) => {
        const sum = staffAttendanceSummary(data.staffAttendance, s.id, dates);
        return [
          s.name, s.staffCode,
          ...dates.map((d) => (recordFor(s.id, d) ? STATUS_META[recordFor(s.id, d)!.status].letter : "")),
          sum.present, sum.late, sum.half, sum.absent, sum.rate,
        ];
      }),
    ],
  );

  return (
    <Card>
      <CardHeader
        title={`${monthLabel} register`}
        subtitle="Click any cell to change it — Present → Late → Half day → Absent"
        icon={<CalendarCheck className="h-5 w-5" />}
        action={
          <div className="flex gap-2 no-print">
            <button onClick={exportCSV} className="btn-ghost text-xs"><Download className="h-3.5 w-3.5" /> CSV</button>
            <button onClick={() => window.print()} className="btn-ghost text-xs"><Printer className="h-3.5 w-3.5" /> Print</button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${STATUS_META[s].cell}`}>
              {STATUS_META[s].letter}
            </span>
            {STATUS_META[s].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-300">·</span>
          Not marked
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Staff
              </th>
              {dates.map((d) => (
                <th
                  key={d}
                  className={`px-1 py-3 text-center text-[10px] font-semibold ${
                    isWeekend(d) ? "bg-slate-50 text-slate-300" : "text-slate-400"
                  }`}
                >
                  {d.slice(8)}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Rate</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const sum = staffAttendanceSummary(data.staffAttendance, s.id, dates);
              return (
                <tr key={s.id} className="border-t border-slate-50">
                  <td className="sticky left-0 z-10 min-w-[168px] border-t border-slate-50 bg-white px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.name} src={s.photoUrl} size={28} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{s.staffCode}</p>
                      </div>
                    </div>
                  </td>
                  {dates.map((d) => {
                    const rec = recordFor(s.id, d);
                    const leave = leaveOnDate(data.leaveRequests, s.id, d);
                    const future = d > today;
                    return (
                      <td key={d} className={`px-0.5 py-2 text-center ${isWeekend(d) ? "bg-slate-50" : ""}`}>
                        <button
                          onClick={() => cycle(s.id, d)}
                          disabled={future}
                          title={`${s.name} · ${formatDate(d)}${rec ? ` · ${STATUS_META[rec.status].label}` : ""}${
                            rec?.checkIn ? ` · in ${formatTime(rec.checkIn)}` : ""
                          }${leave ? ` · approved ${leave.type} leave` : ""}`}
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold transition ${
                            rec
                              ? `${STATUS_META[rec.status].cell} hover:opacity-80`
                              : leave
                                ? "border border-dashed border-amber-300 text-amber-400"
                                : "border border-dashed border-slate-200 text-slate-300 hover:border-slate-400"
                          } ${future ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          {rec ? STATUS_META[rec.status].letter : leave ? "L" : "·"}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-t border-slate-50 px-3 py-2 text-center">
                    <span className={`text-sm font-bold ${sum.rate >= 90 ? "text-emerald-600" : sum.rate >= 75 ? "text-amber-600" : "text-rose-600"}`}>
                      {sum.marked ? `${sum.rate}%` : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Insights
// ─────────────────────────────────────────────────────────────
function Insights({
  staff, workingDates, monthLabel,
}: { staff: Staff[]; workingDates: string[]; monthLabel: string }) {
  const data = useData();
  // Everything here follows the active filter, so a role-filtered view charts
  // that role's records against that role's headcount.
  const records = useMemo(() => {
    const ids = new Set(staff.map((s) => s.id));
    return data.staffAttendance.filter((a) => ids.has(a.staffId));
  }, [staff, data.staffAttendance]);

  const board = useMemo(
    () => staffAttendanceBoard(staff, records, workingDates),
    [staff, records, workingDates],
  );

  const trend = useMemo(
    () => staffAttendanceTrend(records, 21, staff.length),
    [records, staff.length],
  );

  const totals = board.reduce(
    (acc, r) => ({
      present: acc.present + r.present,
      late: acc.late + r.late,
      half: acc.half + r.half,
      absent: acc.absent + r.absent,
    }),
    { present: 0, late: 0, half: 0, absent: 0 },
  );
  const split = [
    { name: "Present", value: totals.present, color: "#10b981" },
    { name: "Late", value: totals.late, color: "#f59e0b" },
    { name: "Half day", value: totals.half, color: "#0ea5e9" },
    { name: "Absent", value: totals.absent, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const marked = board.filter((r) => r.marked > 0);
  const punctual = [...marked].sort((a, b) => b.punctuality - a.punctuality || b.rate - a.rate).slice(0, 5);
  const watchlist = [...marked].filter((r) => r.rate < 90 || r.late >= 3).sort((a, b) => a.rate - b.rate).slice(0, 5);

  const exportSummary = () => downloadCSV(
    `staff-attendance-summary-${workingDates[0]?.slice(0, 7) ?? "month"}.csv`,
    [
      ["Staff", "Code", "Role", "Marked days", "Present", "Late", "Half day", "Absent", "Rate %", "Punctuality %", "Avg hours", "Late minutes"],
      ...board.map((r) => [
        r.staff.name, r.staff.staffCode, r.staff.role, r.marked,
        r.present, r.late, r.half, r.absent, r.rate, r.punctuality,
        formatDuration(r.avgMinutes), r.lateMinutes,
      ]),
    ],
  );

  if (marked.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={<TrendingUp className="h-8 w-8" />}
          title={`Nothing marked in ${monthLabel} yet`}
          hint="Mark the register from the Today tab and insights will build up here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance trend" subtitle="Last 3 weeks, working days only" icon={<TrendingUp className="h-5 w-5" />} />
          <div className="p-4">
            <Bars data={trend} keys={["Present", "Late", "Absent"]} colors={["#10b981", "#f59e0b", "#ef4444"]} stacked height={260} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Status split" subtitle={monthLabel} icon={<PieChart className="h-5 w-5" />} />
          <div className="p-4"><Donut data={split} height={260} /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Most punctual" subtitle="On-time share of days attended" icon={<CheckCircle2 className="h-5 w-5" />} />
          <div className="divide-y divide-slate-100">
            {punctual.map((r) => (
              <div key={r.staff.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={r.staff.name} src={r.staff.photoUrl} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{r.staff.name}</p>
                  <Progress value={r.punctuality} tone="green" />
                </div>
                <span className="text-sm font-bold text-emerald-600">{r.punctuality}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Needs attention" subtitle="Low attendance or repeated lateness" icon={<AlertTriangle className="h-5 w-5" />} />
          {watchlist.length === 0 ? (
            <div className="p-5"><EmptyState title="Everyone is above 90%" hint="No repeated lateness this month." /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {watchlist.map((r) => (
                <div key={r.staff.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={r.staff.name} src={r.staff.photoUrl} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{r.staff.name}</p>
                    <p className="text-xs text-slate-400">
                      {r.absent} absent · {r.late} late{r.lateMinutes > 0 ? ` (${r.lateMinutes} min)` : ""}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${r.rate >= 75 ? "text-amber-600" : "text-rose-600"}`}>{r.rate}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Per-staff summary"
          subtitle={`${monthLabel} · ${workingDates.length} working days`}
          icon={<Timer className="h-5 w-5" />}
          action={<button onClick={exportSummary} className="btn-ghost text-xs no-print"><Download className="h-3.5 w-3.5" /> CSV</button>}
        />
        <Table>
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Staff</Th><Th>Marked</Th><Th>Present</Th><Th>Late</Th><Th>Half day</Th><Th>Absent</Th>
              <Th>Avg hours</Th><Th>Rate</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {board.map((r) => (
              <tr key={r.staff.id} className="hover:bg-slate-50">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.staff.name} src={r.staff.photoUrl} size={32} />
                    <div>
                      <p className="font-medium text-slate-800">{r.staff.name}</p>
                      <p className="text-xs text-slate-400">{r.staff.staffCode}</p>
                    </div>
                  </div>
                </Td>
                <Td>{r.marked}</Td>
                <Td className="text-emerald-600">{r.present}</Td>
                <Td className="text-amber-600">{r.late}</Td>
                <Td className="text-sky-600">{r.half}</Td>
                <Td className="text-rose-600">{r.absent}</Td>
                <Td>{formatDuration(r.avgMinutes)}</Td>
                <Td>
                  <Badge tone={r.rate >= 90 ? "green" : r.rate >= 75 ? "amber" : "red"}>
                    {r.marked ? `${r.rate}%` : "—"}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
