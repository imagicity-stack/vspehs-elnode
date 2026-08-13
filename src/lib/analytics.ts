// ─────────────────────────────────────────────────────────────
// Derived analytics used by dashboards across portals.
// Pure functions over the collections held in the store.
// ─────────────────────────────────────────────────────────────

import {
  AttendanceRecord, AttendanceStatus, SchoolClass, Invoice, LeaveRequest, Payment,
  Staff, StaffAttendanceRecord, Student,
} from "./types";
import { isoDate } from "./utils";

const lastNDates = (n: number) => {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    // Local calendar date — `toISOString()` would shift to UTC and, east of
    // Greenwich, label every entry with the previous day.
    out.push(isoDate(x));
  }
  return out;
};

export function attendanceForDate(records: AttendanceRecord[], date: string) {
  const day = records.filter((r) => r.date === date);
  const present = day.filter((r) => r.status === "present").length;
  const late = day.filter((r) => r.status === "late").length;
  const absent = day.filter((r) => r.status === "absent").length;
  const half = day.filter((r) => r.status === "half-day").length;
  const total = day.length || 1;
  return { present, late, absent, half, total: day.length, rate: Math.round(((present + late + half) / total) * 100) };
}

export function attendanceTrend(records: AttendanceRecord[], days = 10) {
  return lastNDates(days)
    .map((date) => {
      const dow = new Date(date).getDay();
      if (dow === 0 || dow === 6) return null;
      const a = attendanceForDate(records, date);
      return {
        label: new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        date,
        Present: a.present,
        Late: a.late,
        Absent: a.absent,
        rate: a.rate,
      };
    })
    .filter(Boolean) as any[];
}

export function studentAttendanceRate(records: AttendanceRecord[], studentId: string) {
  const mine = records.filter((r) => r.studentId === studentId);
  if (!mine.length) return { rate: 100, present: 0, total: 0 };
  const ok = mine.filter((r) => r.status === "present" || r.status === "late" || r.status === "half-day").length;
  return { rate: Math.round((ok / mine.length) * 100), present: ok, total: mine.length };
}

// ─────────────────────────────────────────────────────────────
// Staff attendance
// ─────────────────────────────────────────────────────────────

const envInt = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * The working day staff are measured against. Punctuality and hours are derived
 * from it, so a school with different hours only has to set the env vars.
 */
export const WORK_DAY = {
  start: process.env.NEXT_PUBLIC_WORKDAY_START || "09:00",
  end: process.env.NEXT_PUBLIC_WORKDAY_END || "16:00",
  /** Minutes after `start` that are still counted as on time. */
  grace: envInt(process.env.NEXT_PUBLIC_WORKDAY_GRACE, 10),
};

/** "09:05" → 545 minutes past midnight. `null` when absent or malformed. */
export function toMinutes(hhmm?: string): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** 545 → "9h 05m" (duration, not clock time). */
export function formatDuration(mins: number) {
  if (!Number.isFinite(mins) || mins <= 0) return "—";
  return `${Math.floor(mins / 60)}h ${String(Math.round(mins % 60)).padStart(2, "0")}m`;
}

/**
 * Punctuality implied by a check-in time. `lateBy` counts minutes past the
 * scheduled start (not past the grace period), which is what a register shows.
 */
export function statusFromCheckIn(checkIn?: string): { status: AttendanceStatus; lateBy?: number } | null {
  const start = toMinutes(WORK_DAY.start);
  const at = toMinutes(checkIn);
  if (at === null || start === null) return null;
  if (at <= start + WORK_DAY.grace) return { status: "present" };
  return { status: "late", lateBy: at - start };
}

/** Minutes between the two punches. 0 when either is missing or out of order. */
export function workedMinutes(r: Pick<StaffAttendanceRecord, "checkIn" | "checkOut">) {
  const inM = toMinutes(r.checkIn);
  const outM = toMinutes(r.checkOut);
  if (inM === null || outM === null || outM <= inM) return 0;
  return outM - inM;
}

export const isWeekend = (iso: string) => {
  const dow = new Date(`${iso}T00:00:00`).getDay();
  return dow === 0 || dow === 6;
};

/** Every calendar date in a month as ISO strings. `month` is 0-indexed. */
export function monthDates(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from(
    { length: days },
    (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
  );
}

/** The approved leave covering `date` for a staff member, if any. */
export function leaveOnDate(leave: LeaveRequest[], staffId: string, date: string) {
  return leave.find(
    (l) => l.staffId === staffId && l.status === "approved" && l.from <= date && l.to >= date,
  );
}

/**
 * One day's headcount. `strength` is the roster size — passing it means staff
 * nobody marked count against the rate instead of silently vanishing from it.
 */
export function staffAttendanceForDate(
  records: StaffAttendanceRecord[], date: string, strength?: number,
) {
  const day = records.filter((r) => r.date === date);
  const present = day.filter((r) => r.status === "present").length;
  const late = day.filter((r) => r.status === "late").length;
  const absent = day.filter((r) => r.status === "absent").length;
  const half = day.filter((r) => r.status === "half-day").length;
  const total = strength ?? day.length;
  const inAttendance = present + late + half;
  return {
    present, late, absent, half,
    marked: day.length,
    total,
    unmarked: Math.max(0, total - day.length),
    rate: total ? Math.round((inAttendance / total) * 100) : 0,
    inAttendance,
  };
}

/** Working-day trend, weekends dropped (a closed school isn't an absence). */
export function staffAttendanceTrend(records: StaffAttendanceRecord[], days = 14, strength?: number) {
  return lastNDates(days)
    .filter((date) => !isWeekend(date))
    .map((date) => {
      const a = staffAttendanceForDate(records, date, strength);
      return {
        label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        date,
        Present: a.present,
        Late: a.late,
        Absent: a.absent,
        rate: a.rate,
      };
    });
}

/**
 * A staff member's record over `dates` (a month, a term…). Restricting to a
 * date window keeps a long-serving employee's history from diluting the view.
 */
export function staffAttendanceSummary(
  records: StaffAttendanceRecord[], staffId: string, dates?: string[],
) {
  const within = dates ? new Set(dates) : null;
  const mine = records.filter((r) => r.staffId === staffId && (!within || within.has(r.date)));
  const present = mine.filter((r) => r.status === "present").length;
  const late = mine.filter((r) => r.status === "late").length;
  const absent = mine.filter((r) => r.status === "absent").length;
  const half = mine.filter((r) => r.status === "half-day").length;
  const marked = mine.length;
  const inAttendance = present + late + half;
  const withHours = mine.filter((r) => workedMinutes(r) > 0);
  const totalMinutes = withHours.reduce((s, r) => s + workedMinutes(r), 0);
  const lateMinutes = mine.reduce((s, r) => s + (r.status === "late" ? r.lateBy ?? 0 : 0), 0);
  return {
    present, late, absent, half, marked, inAttendance,
    rate: marked ? Math.round((inAttendance / marked) * 100) : 0,
    punctuality: inAttendance ? Math.round(((present + half) / inAttendance) * 100) : 100,
    totalMinutes,
    avgMinutes: withHours.length ? Math.round(totalMinutes / withHours.length) : 0,
    lateMinutes,
  };
}

/** Per-staff summaries for a window, ready to rank or table. */
export function staffAttendanceBoard(
  staff: Staff[], records: StaffAttendanceRecord[], dates?: string[],
) {
  return staff.map((s) => ({ staff: s, ...staffAttendanceSummary(records, s.id, dates) }));
}

/**
 * Money fields, coerced. Invoices imported or seeded outside the app can carry
 * a missing or string amount; without this one bad document turns a whole
 * dashboard into "₹NaN".
 */
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const invoiceDue = (i: Invoice) => Math.max(0, num(i.total) - num(i.paid));

/**
 * The status to display. Nothing ever *writes* "overdue" — an invoice is raised
 * as "pending" and only moves to "partial"/"paid" — so it is derived here from
 * the due date instead. Without this the Overdue tile is permanently ₹0 and the
 * "overdue" invoice filter never matches anything.
 */
export function invoiceStatus(i: Invoice, today: string): Invoice["status"] {
  if (i.status === "paid" || invoiceDue(i) === 0) return "paid";
  if (i.dueDate && i.dueDate < today) return "overdue";
  return i.status === "overdue" ? "pending" : i.status;
}

export function collectionSummary(invoices: Invoice[], today = new Date().toISOString().slice(0, 10)) {
  const billed = invoices.reduce((s, i) => s + num(i.total), 0);
  const collected = invoices.reduce((s, i) => s + num(i.paid), 0);
  const pending = invoices
    .filter((i) => invoiceStatus(i, today) !== "paid")
    .reduce((s, i) => s + invoiceDue(i), 0);
  const overdue = invoices
    .filter((i) => invoiceStatus(i, today) === "overdue")
    .reduce((s, i) => s + invoiceDue(i), 0);
  const rate = billed ? Math.round((collected / billed) * 100) : 0;
  return { billed, collected, pending, overdue, rate };
}

export function collectionTrend(payments: Payment[], days = 14) {
  return lastNDates(days).map((date) => ({
    label: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    date,
    Collected: payments.filter((p) => p.date === date).reduce((s, p) => s + num(p.amount), 0),
  }));
}

export function feeByCategory(invoices: Invoice[]) {
  const map = new Map<string, number>();
  for (const inv of invoices) {
    // `lines` is absent on invoices written by anything other than this app
    // (imports, console edits) — iterating it blindly would throw and blank the
    // entire dashboard rather than just this chart.
    for (const line of inv.lines ?? []) {
      const key = line?.name ?? "Other";
      map.set(key, (map.get(key) ?? 0) + num(line?.amount));
    }
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function paymentMethodSplit(payments: Payment[]) {
  const map = new Map<string, number>();
  for (const p of payments) {
    const method = p.method ?? "other";
    map.set(method, (map.get(method) ?? 0) + num(p.amount));
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name: name.toUpperCase(), value }));
}

export function enrolmentByLevel(students: Student[], classes: SchoolClass[]) {
  const map = new Map<string, number>();
  for (const s of students) {
    const cls = classes.find((c) => c.id === s.classId);
    const level = cls?.level ?? "Other";
    map.set(level, (map.get(level) ?? 0) + 1);
  }
  return ["Playgroup", "Nursery", "LKG", "UKG"].map((level) => ({ label: level, Students: map.get(level) ?? 0 }));
}

export function genderSplit(students: Student[]) {
  const boys = students.filter((s) => s.gender === "male").length;
  const girls = students.filter((s) => s.gender === "female").length;
  return [
    { name: "Boys", value: boys, color: "#1d40f5" },
    { name: "Girls", value: girls, color: "#f97316" },
  ];
}

export function classHealth(
  students: Student[], classes: SchoolClass[], records: AttendanceRecord[], invoices: Invoice[], today: string,
) {
  return classes.map((c) => {
    const cls = students.filter((s) => s.classId === c.id);
    const att = attendanceForDate(records.filter((r) => r.classId === c.id), today);
    const studentIds = new Set(cls.map((s) => s.id));
    const dues = invoices
      .filter((i) => studentIds.has(i.studentId))
      .reduce((s, i) => s + invoiceDue(i), 0);
    return {
      class: c,
      strength: cls.length,
      capacity: c.capacity,
      attendanceRate: att.rate,
      present: att.present + att.late,
      dues,
    };
  });
}
