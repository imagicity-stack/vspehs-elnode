// ─────────────────────────────────────────────────────────────
// Derived analytics used by dashboards across portals.
// Pure functions over the collections held in the store.
// ─────────────────────────────────────────────────────────────

import {
  AttendanceRecord, SchoolClass, Invoice, Payment, Student,
} from "./types";

const lastNDates = (n: number) => {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
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

export function collectionSummary(invoices: Invoice[]) {
  const billed = invoices.reduce((s, i) => s + i.total, 0);
  const collected = invoices.reduce((s, i) => s + i.paid, 0);
  const pending = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.total - i.paid), 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.total - i.paid), 0);
  const rate = billed ? Math.round((collected / billed) * 100) : 0;
  return { billed, collected, pending, overdue, rate };
}

export function collectionTrend(payments: Payment[], days = 14) {
  return lastNDates(days).map((date) => ({
    label: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    date,
    Collected: payments.filter((p) => p.date === date).reduce((s, p) => s + p.amount, 0),
  }));
}

export function feeByCategory(invoices: Invoice[]) {
  const map = new Map<string, number>();
  for (const inv of invoices) {
    for (const line of inv.lines) {
      const key = line.name;
      map.set(key, (map.get(key) ?? 0) + line.amount);
    }
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function paymentMethodSplit(payments: Payment[]) {
  const map = new Map<string, number>();
  for (const p of payments) map.set(p.method, (map.get(p.method) ?? 0) + p.amount);
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
      .filter((i) => studentIds.has(i.studentId) && i.status !== "paid")
      .reduce((s, i) => s + (i.total - i.paid), 0);
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
