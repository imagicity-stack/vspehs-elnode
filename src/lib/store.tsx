"use client";

// ─────────────────────────────────────────────────────────────
// El-Node — Client data store
// ─────────────────────────────────────────────────────────────
// A single React context that holds every collection and exposes typed
// mutators used across the portals. In DEMO MODE it is seeded from
// `mockData` and persisted to localStorage so changes survive reloads.
// When Firebase is configured the same shape can be hydrated from Firestore
// (see src/lib/firestore.ts) — the UI layer is storage-agnostic.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as seed from "./mockData";
import {
  AttendanceRecord, Circular, SchoolClass, Concession, DailyUpdate, Exam,
  ExamResult, FeeHead, Homework, Invoice, LeaveRequest, Payment, PaymentMethod,
  SchoolEvent, Staff, StaffAttendanceRecord, Student, TaskItem,
} from "./types";

interface DataState {
  classes: SchoolClass[];
  staff: Staff[];
  students: Student[];
  feeHeads: FeeHead[];
  invoices: Invoice[];
  payments: Payment[];
  concessions: Concession[];
  attendance: AttendanceRecord[];
  staffAttendance: StaffAttendanceRecord[];
  dailyUpdates: DailyUpdate[];
  homework: Homework[];
  circulars: Circular[];
  events: SchoolEvent[];
  exams: Exam[];
  examResults: ExamResult[];
  leaveRequests: LeaveRequest[];
  taskItems: TaskItem[];
}

function seededState(): DataState {
  return {
    classes: seed.classes,
    staff: seed.staff,
    students: seed.students,
    feeHeads: seed.feeHeads,
    invoices: seed.invoices,
    payments: seed.payments,
    concessions: seed.concessions,
    attendance: seed.attendance,
    staffAttendance: seed.staffAttendance,
    dailyUpdates: seed.dailyUpdates,
    homework: seed.homework,
    circulars: seed.circulars,
    events: seed.events,
    exams: seed.exams,
    examResults: seed.examResults,
    leaveRequests: seed.leaveRequests,
    taskItems: seed.taskItems,
  };
}

const STORAGE_KEY = "elnode.data.v1";
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

interface DataContextValue extends DataState {
  // attendance
  markAttendance: (records: Omit<AttendanceRecord, "id">[]) => void;
  // class updates / homework / circulars
  addDailyUpdate: (u: Omit<DailyUpdate, "id">) => void;
  addHomework: (h: Omit<Homework, "id">) => void;
  addCircular: (c: Omit<Circular, "id">) => void;
  // fees
  recordPayment: (args: {
    invoiceId: string; studentId: string; amount: number; method: PaymentMethod;
    collectedBy: string; reference?: string;
  }) => Payment;
  addConcession: (c: Omit<Concession, "id">) => void;
  generateInvoice: (inv: Omit<Invoice, "id">) => void;
  // tasks / leave
  toggleTask: (id: string) => void;
  addTask: (t: Omit<TaskItem, "id">) => void;
  applyLeave: (l: Omit<LeaveRequest, "id">) => void;
  setLeaveStatus: (id: string, status: LeaveRequest["status"]) => void;
  // people
  addStudent: (s: Omit<Student, "id">) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  addStaff: (s: Omit<Staff, "id">) => void;
  // exams
  saveExamResult: (r: ExamResult) => void;
  setExamPublished: (examId: string, published: boolean) => void;
  resetDemo: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(seededState);
  const [hydrated, setHydrated] = useState(false);

  // hydrate from localStorage (demo persistence)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const value = useMemo<DataContextValue>(() => {
    const patch = (p: Partial<DataState>) => setState((s) => ({ ...s, ...p }));

    return {
      ...state,

      markAttendance: (records) =>
        setState((s) => {
          const dates = new Set(records.map((r) => `${r.studentId}|${r.date}`));
          const kept = s.attendance.filter((a) => !dates.has(`${a.studentId}|${a.date}`));
          const added = records.map((r) => ({ ...r, id: uid("att") }));
          return { ...s, attendance: [...added, ...kept] };
        }),

      addDailyUpdate: (u) =>
        setState((s) => ({ ...s, dailyUpdates: [{ ...u, id: uid("du") }, ...s.dailyUpdates] })),

      addHomework: (h) =>
        setState((s) => ({ ...s, homework: [{ ...h, id: uid("hw") }, ...s.homework] })),

      addCircular: (c) =>
        setState((s) => ({ ...s, circulars: [{ ...c, id: uid("ci") }, ...s.circulars] })),

      recordPayment: ({ invoiceId, studentId, amount, method, collectedBy, reference }) => {
        const payment: Payment = {
          id: uid("pay"), receiptNo: `RC-${5000 + Math.floor(Math.random() * 4000)}`,
          invoiceId, studentId, amount, method, date: new Date().toISOString().slice(0, 10),
          collectedBy, reference,
        };
        setState((s) => {
          const invoices = s.invoices.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            const paid = inv.paid + amount;
            const status: Invoice["status"] = paid >= inv.total ? "paid" : paid > 0 ? "partial" : inv.status;
            return { ...inv, paid, status };
          });
          return { ...s, invoices, payments: [payment, ...s.payments] };
        });
        return payment;
      },

      addConcession: (c) =>
        setState((s) => ({ ...s, concessions: [{ ...c, id: uid("con") }, ...s.concessions] })),

      generateInvoice: (inv) =>
        setState((s) => ({ ...s, invoices: [{ ...inv, id: uid("inv") }, ...s.invoices] })),

      toggleTask: (id) =>
        setState((s) => ({
          ...s,
          taskItems: s.taskItems.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      addTask: (t) =>
        setState((s) => ({ ...s, taskItems: [...s.taskItems, { ...t, id: uid("tk") }] })),

      applyLeave: (l) =>
        setState((s) => ({ ...s, leaveRequests: [{ ...l, id: uid("lv") }, ...s.leaveRequests] })),

      setLeaveStatus: (id, status) =>
        setState((s) => ({
          ...s,
          leaveRequests: s.leaveRequests.map((l) => (l.id === id ? { ...l, status } : l)),
        })),

      addStudent: (st) =>
        setState((s) => ({ ...s, students: [...s.students, { ...st, id: uid("st") }] })),

      updateStudent: (id, p) =>
        setState((s) => ({
          ...s,
          students: s.students.map((st) => (st.id === id ? { ...st, ...p } : st)),
        })),

      addStaff: (st) =>
        setState((s) => ({ ...s, staff: [...s.staff, { ...st, id: uid("s") }] })),

      saveExamResult: (r) =>
        setState((s) => {
          const exists = s.examResults.some((x) => x.id === r.id);
          return {
            ...s,
            examResults: exists
              ? s.examResults.map((x) => (x.id === r.id ? r : x))
              : [...s.examResults, r],
          };
        }),

      setExamPublished: (examId, published) =>
        setState((s) => ({
          ...s,
          exams: s.exams.map((e) => (e.id === examId ? { ...e, published } : e)),
        })),

      resetDemo: () => {
        const fresh = seededState();
        setState(fresh);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within <DataProvider>");
  return ctx;
}

// ── Convenience selectors ────────────────────────────────────
export function useStudent(id?: string) {
  const { students } = useData();
  return students.find((s) => s.id === id);
}
