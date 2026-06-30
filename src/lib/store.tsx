"use client";

// ─────────────────────────────────────────────────────────────
// El-Node — Client data store
// ─────────────────────────────────────────────────────────────
// A single React context that holds every collection and exposes typed
// mutators used across the portals.
//
// • DEMO MODE (no Firebase configured): data is persisted to localStorage so
//   changes survive reloads, and lives only in that browser.
// • FIREBASE MODE: the store hydrates from Firestore when a user signs in, and
//   every mutator mirrors its write to Firestore via src/lib/firestore.ts.
//   localStorage is not used — Firestore is the source of truth.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, isDemoMode } from "./firebase";
import { fetchCollection, upsertDoc, removeDoc } from "./firestore";
import {
  AttendanceRecord, Circular, SchoolClass, Concession, DailyUpdate, Exam,
  ExamResult, FeeHead, Homework, Invoice, LeaveRequest, Payment, PaymentMethod,
  SchoolEvent, Staff, StaffAttendanceRecord, Student, Subject, TaskItem,
} from "./types";

interface DataState {
  subjects: Subject[];
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

// State keys that map 1:1 to Firestore collection names.
const COLLECTION_KEYS: (keyof DataState)[] = [
  "subjects", "classes", "staff", "students", "feeHeads", "invoices", "payments",
  "concessions", "attendance", "staffAttendance", "dailyUpdates", "homework",
  "circulars", "events", "exams", "examResults", "leaveRequests", "taskItems",
];

function emptyState(): DataState {
  return {
    subjects: [],
    classes: [],
    staff: [],
    students: [],
    feeHeads: [],
    invoices: [],
    payments: [],
    concessions: [],
    attendance: [],
    staffAttendance: [],
    dailyUpdates: [],
    homework: [],
    circulars: [],
    events: [],
    exams: [],
    examResults: [],
    leaveRequests: [],
    taskItems: [],
  };
}

// Pull every collection the signed-in user is allowed to read. Reads are
// role-scoped by the Firestore rules, so a denied collection (e.g. a parent
// reading `staff`) is tolerated and simply left empty rather than failing the
// whole hydration.
async function hydrateFromFirestore(): Promise<DataState> {
  const base = emptyState();
  const results = await Promise.allSettled(
    COLLECTION_KEYS.map((k) => fetchCollection<{ id: string }>(k)),
  );
  const target = base as unknown as Record<string, unknown>;
  results.forEach((res, i) => {
    const key = COLLECTION_KEYS[i];
    if (res.status === "fulfilled") {
      target[key] = res.value;
    } else {
      console.warn(`[firestore] could not load "${key}":`, res.reason?.message ?? res.reason);
    }
  });
  return base;
}

const STORAGE_KEY = "elnode.data.v2";
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
  addStaff: (s: Omit<Staff, "id">) => Staff;
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  // subjects
  addSubject: (s: Omit<Subject, "id">) => void;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  // classes
  addClass: (c: Omit<SchoolClass, "id">) => void;
  updateClass: (id: string, patch: Partial<SchoolClass>) => void;
  deleteClass: (id: string) => void;
  // exams
  saveExamResult: (r: ExamResult) => void;
  setExamPublished: (examId: string, published: boolean) => void;
  resetDemo: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate. Demo mode reads localStorage once; Firebase mode (re)loads from
  // Firestore whenever the signed-in user changes.
  useEffect(() => {
    if (isDemoMode) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      setHydrated(true);
      return;
    }
    if (!auth) {
      setHydrated(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setState(emptyState());
        setHydrated(true);
        return;
      }
      try {
        setState(await hydrateFromFirestore());
      } catch (e) {
        console.error("[firestore] hydration failed", e);
      }
      setHydrated(true);
    });
    return () => unsub();
  }, []);

  // Persist to localStorage only in demo mode. In Firebase mode the per-mutator
  // writes keep Firestore current, so caching here would only risk staleness.
  useEffect(() => {
    if (!hydrated || !isDemoMode) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const value = useMemo<DataContextValue>(() => {
    // Mirror a single document to Firestore (no-op in demo mode). `merge: true`
    // means passing { id, ...patch } applies a partial update.
    const writeDoc = <T extends { id: string }>(name: keyof DataState, v: T) => {
      if (isDemoMode) return;
      upsertDoc(String(name), v).catch((e) =>
        console.error(`[firestore] upsert ${String(name)}/${v.id} failed`, e),
      );
    };
    const eraseDoc = (name: keyof DataState, id: string) => {
      if (isDemoMode) return;
      removeDoc(String(name), id).catch((e) =>
        console.error(`[firestore] remove ${String(name)}/${id} failed`, e),
      );
    };

    return {
      ...state,

      markAttendance: (records) => {
        const keys = new Set(records.map((r) => `${r.studentId}|${r.date}`));
        const replaced = state.attendance.filter((a) => keys.has(`${a.studentId}|${a.date}`));
        const added = records.map((r) => ({ ...r, id: uid("att") }));
        setState((s) => {
          const kept = s.attendance.filter((a) => !keys.has(`${a.studentId}|${a.date}`));
          return { ...s, attendance: [...added, ...kept] };
        });
        replaced.forEach((a) => eraseDoc("attendance", a.id));
        added.forEach((a) => writeDoc("attendance", a));
      },

      addDailyUpdate: (u) => {
        const doc = { ...u, id: uid("du") };
        setState((s) => ({ ...s, dailyUpdates: [doc, ...s.dailyUpdates] }));
        writeDoc("dailyUpdates", doc);
      },

      addHomework: (h) => {
        const doc = { ...h, id: uid("hw") };
        setState((s) => ({ ...s, homework: [doc, ...s.homework] }));
        writeDoc("homework", doc);
      },

      addCircular: (c) => {
        const doc = { ...c, id: uid("ci") };
        setState((s) => ({ ...s, circulars: [doc, ...s.circulars] }));
        writeDoc("circulars", doc);
      },

      recordPayment: ({ invoiceId, studentId, amount, method, collectedBy, reference }) => {
        const payment: Payment = {
          id: uid("pay"), receiptNo: `RC-${5000 + Math.floor(Math.random() * 4000)}`,
          invoiceId, studentId, amount, method, date: new Date().toISOString().slice(0, 10),
          collectedBy, reference,
        };
        const inv = state.invoices.find((i) => i.id === invoiceId);
        let updatedInvoice: Invoice | undefined;
        if (inv) {
          const paid = inv.paid + amount;
          const status: Invoice["status"] = paid >= inv.total ? "paid" : paid > 0 ? "partial" : inv.status;
          updatedInvoice = { ...inv, paid, status };
        }
        setState((s) => {
          const invoices = s.invoices.map((i) => {
            if (i.id !== invoiceId) return i;
            const paid = i.paid + amount;
            const status: Invoice["status"] = paid >= i.total ? "paid" : paid > 0 ? "partial" : i.status;
            return { ...i, paid, status };
          });
          return { ...s, invoices, payments: [payment, ...s.payments] };
        });
        writeDoc("payments", payment);
        if (updatedInvoice) writeDoc("invoices", updatedInvoice);
        return payment;
      },

      addConcession: (c) => {
        const doc = { ...c, id: uid("con") };
        setState((s) => ({ ...s, concessions: [doc, ...s.concessions] }));
        writeDoc("concessions", doc);
      },

      generateInvoice: (inv) => {
        const doc = { ...inv, id: uid("inv") };
        setState((s) => ({ ...s, invoices: [doc, ...s.invoices] }));
        writeDoc("invoices", doc);
      },

      toggleTask: (id) => {
        const current = state.taskItems.find((t) => t.id === id);
        setState((s) => ({
          ...s,
          taskItems: s.taskItems.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        }));
        if (current) writeDoc("taskItems", { id, done: !current.done });
      },

      addTask: (t) => {
        const doc = { ...t, id: uid("tk") };
        setState((s) => ({ ...s, taskItems: [...s.taskItems, doc] }));
        writeDoc("taskItems", doc);
      },

      applyLeave: (l) => {
        const doc = { ...l, id: uid("lv") };
        setState((s) => ({ ...s, leaveRequests: [doc, ...s.leaveRequests] }));
        writeDoc("leaveRequests", doc);
      },

      setLeaveStatus: (id, status) => {
        setState((s) => ({
          ...s,
          leaveRequests: s.leaveRequests.map((l) => (l.id === id ? { ...l, status } : l)),
        }));
        writeDoc("leaveRequests", { id, status });
      },

      addStudent: (st) => {
        // Deterministic id keyed on the admission number so the optimistic
        // client write and the server-side /api/students/create write resolve
        // to the same Firestore document.
        const id = `st-${st.admissionNo}`;
        const doc = { ...st, id };
        setState((s) => {
          const exists = s.students.some((x) => x.id === id);
          return {
            ...s,
            students: exists ? s.students.map((x) => (x.id === id ? doc : x)) : [...s.students, doc],
          };
        });
        writeDoc("students", doc);
      },

      updateStudent: (id, p) => {
        setState((s) => ({
          ...s,
          students: s.students.map((st) => (st.id === id ? { ...st, ...p } : st)),
        }));
        writeDoc("students", { id, ...p });
      },

      addStaff: (st) => {
        const doc = { ...st, id: uid("s") };
        setState((s) => ({ ...s, staff: [...s.staff, doc] }));
        writeDoc("staff", doc);
        return doc;
      },

      updateStaff: (id, p) => {
        setState((s) => ({
          ...s,
          staff: s.staff.map((st) => (st.id === id ? { ...st, ...p } : st)),
        }));
        writeDoc("staff", { id, ...p });
      },

      addSubject: (sub) => {
        const doc = { ...sub, id: uid("sub") };
        setState((s) => ({ ...s, subjects: [...s.subjects, doc] }));
        writeDoc("subjects", doc);
      },

      updateSubject: (id, p) => {
        setState((s) => ({
          ...s,
          subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...p } : sub)),
        }));
        writeDoc("subjects", { id, ...p });
      },

      deleteSubject: (id) => {
        // Cascade: drop the subject from every staff member that referenced it.
        const affected = state.staff.filter((m) => m.subjects.includes(id));
        setState((s) => ({
          ...s,
          subjects: s.subjects.filter((sub) => sub.id !== id),
          staff: s.staff.map((m) => ({
            ...m,
            subjects: m.subjects.filter((sid) => sid !== id),
          })),
        }));
        eraseDoc("subjects", id);
        affected.forEach((m) =>
          writeDoc("staff", { id: m.id, subjects: m.subjects.filter((sid) => sid !== id) }),
        );
      },

      addClass: (c) => {
        const doc = { ...c, id: uid("cls") };
        setState((s) => ({ ...s, classes: [...s.classes, doc] }));
        writeDoc("classes", doc);
      },

      updateClass: (id, p) => {
        setState((s) => ({
          ...s,
          classes: s.classes.map((c) => (c.id === id ? { ...c, ...p } : c)),
        }));
        writeDoc("classes", { id, ...p });
      },

      deleteClass: (id) => {
        setState((s) => ({ ...s, classes: s.classes.filter((c) => c.id !== id) }));
        eraseDoc("classes", id);
      },

      saveExamResult: (r) => {
        setState((s) => {
          const exists = s.examResults.some((x) => x.id === r.id);
          return {
            ...s,
            examResults: exists
              ? s.examResults.map((x) => (x.id === r.id ? r : x))
              : [...s.examResults, r],
          };
        });
        writeDoc("examResults", r);
      },

      setExamPublished: (examId, published) => {
        setState((s) => ({
          ...s,
          exams: s.exams.map((e) => (e.id === examId ? { ...e, published } : e)),
        }));
        writeDoc("exams", { id: examId, published });
      },

      resetDemo: () => {
        setState(emptyState());
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
