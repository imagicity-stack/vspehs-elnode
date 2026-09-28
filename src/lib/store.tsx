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
import { where } from "firebase/firestore";
import { auth, isDemoMode } from "./firebase";
import {
  subscribeCollection, upsertDoc, upsertMany, removeDoc, removeMany, fetchDoc,
  type QueryConstraint,
} from "./firestore";
import { toast } from "@/components/Toast";
import { isAllowedAdminEmail } from "./admins";
import { statusFromCheckIn } from "./analytics";
import {
  AcademicSession, AppNotification, AttendanceRecord, AttendanceStatus, AuditLog, Circular,
  SchoolClass, Concession, DailyUpdate, Exam, ExamGroup, ExamMarks, ExamResult, FeeHead,
  GradeScale, Homework, Invoice, LeaveRequest, MarksSheetStatus, Payment, PaymentMethod,
  ReportCardRecord, Role, SchoolEvent, Staff, StaffAttendanceRecord, Student, StudentExamResult,
  Subject, SubjectExam, TaskItem, TeacherAssignment,
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
  /** Pre-primary skill assessments (legacy, still used by playgroup–UKG). */
  exams: Exam[];
  examResults: ExamResult[];
  leaveRequests: LeaveRequest[];
  taskItems: TaskItem[];
  // ── Examination system ──
  academicSessions: AcademicSession[];
  teacherAssignments: TeacherAssignment[];
  gradeScales: GradeScale[];
  examGroups: ExamGroup[];
  subjectExams: SubjectExam[];
  examMarks: ExamMarks[];
  /**
   * Published per-student result snapshots. Deliberately NOT named
   * `examResults` — that collection already holds the pre-primary skill
   * assessments and reusing the name would collide with live data.
   */
  studentResults: StudentExamResult[];
  reportCards: ReportCardRecord[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
}

// State keys that map 1:1 to Firestore collection names.
export const COLLECTION_KEYS: (keyof DataState)[] = [
  "subjects", "classes", "staff", "students", "feeHeads", "invoices", "payments",
  "concessions", "attendance", "staffAttendance", "dailyUpdates", "homework",
  "circulars", "events", "exams", "examResults", "leaveRequests", "taskItems",
  "academicSessions", "teacherAssignments", "gradeScales", "examGroups",
  "subjectExams", "examMarks", "studentResults", "reportCards", "auditLogs",
  "notifications",
];

/**
 * Collections `firestore.rules` restricts to staff. A parent being denied these
 * is expected, so it must not be reported as a fault.
 */
export const STAFF_ONLY_KEYS: (keyof DataState)[] = [
  "staff", "staffAttendance", "leaveRequests", "taskItems",
  "teacherAssignments", "gradeScales", "examMarks", "reportCards", "auditLogs",
];

/** Who performed an audited action. */
export interface AuditActor {
  id: string;
  name: string;
  role: string;
}

/** Everything a parent's session needs to know to scope its own reads. */
export interface ReadScope {
  role: Role | null;
  studentIds: string[];
  staffId?: string;
}

/**
 * How each collection is listened to for the signed-in user. A rule that grants
 * a parent only their own children's documents makes an unfiltered collection
 * listen fail outright, so the query has to mirror the rule — and collections a
 * parent has no business reading are skipped rather than denied noisily.
 */
const COLLECTION_SCOPES: Partial<
  Record<keyof DataState, (scope: ReadScope) => QueryConstraint[] | "skip">
> = {
  studentResults: ({ role, studentIds }) => {
    if (role !== "parent") return [];
    // `in` takes at most 30 values; a parent with more children than that is
    // not a real case, and slicing keeps the listen valid rather than failing.
    return studentIds.length ? [where("studentId", "in", studentIds.slice(0, 30))] : "skip";
  },
  // Draft marks must never reach a parent (business rule 4).
  examMarks: ({ role }) => (role === "parent" ? "skip" : []),
  teacherAssignments: ({ role }) => (role === "parent" ? "skip" : []),
  gradeScales: ({ role }) => (role === "parent" ? "skip" : []),
  reportCards: ({ role }) => (role === "parent" ? "skip" : []),
  auditLogs: ({ role }) => (role === "superadmin" ? [] : "skip"),
};

/** Outcome of the live read for one collection — powers the health banner. */
export interface CollectionHealth {
  state: "pending" | "ok" | "error";
  /** Firestore error code, e.g. "permission-denied". */
  code?: string;
  message?: string;
}

function pendingHealth(): Record<string, CollectionHealth> {
  const out: Record<string, CollectionHealth> = {};
  for (const k of COLLECTION_KEYS) out[k] = { state: isDemoMode ? "ok" : "pending" };
  return out;
}

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
    academicSessions: [],
    teacherAssignments: [],
    gradeScales: [],
    examGroups: [],
    subjectExams: [],
    examMarks: [],
    studentResults: [],
    reportCards: [],
    auditLogs: [],
    notifications: [],
  };
}

const STORAGE_KEY = "elnode.data.v2";
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Deterministic id for a staff member's day. One document per (staff, date)
 * means re-saving the register updates the row rather than stacking duplicates,
 * and two admins marking the same day converge instead of double-counting.
 */
const staffAttendanceId = (staffId: string, date: string) => `sat-${staffId}-${date}`;

interface DataContextValue extends DataState {
  // attendance
  markAttendance: (records: Omit<AttendanceRecord, "id">[]) => void;
  /** Replaces the staff register for each (staffId, date) pair supplied. */
  markStaffAttendance: (records: Omit<StaffAttendanceRecord, "id">[]) => void;
  /** Self-service clock in / clock out — merges into the day's record. */
  punchStaff: (args: { staffId: string; date: string; kind: "in" | "out"; time: string }) => void;
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
  // fee heads
  addFeeHead: (f: Omit<FeeHead, "id">) => void;
  updateFeeHead: (id: string, patch: Partial<FeeHead>) => void;
  deleteFeeHead: (id: string) => void;
  // tasks / leave
  toggleTask: (id: string) => void;
  addTask: (t: Omit<TaskItem, "id">) => void;
  applyLeave: (l: Omit<LeaveRequest, "id">) => void;
  setLeaveStatus: (id: string, status: LeaveRequest["status"]) => void;
  // people
  addStudent: (s: Omit<Student, "id">) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addStaff: (s: Omit<Staff, "id">) => Staff;
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  // subjects
  addSubject: (s: Omit<Subject, "id">) => void;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  // classes
  addClass: (c: Omit<SchoolClass, "id">) => void;
  updateClass: (id: string, patch: Partial<SchoolClass>) => void;
  deleteClass: (id: string) => void;
  // exams (legacy pre-primary skill assessments)
  saveExamResult: (r: ExamResult) => void;
  setExamPublished: (examId: string, published: boolean) => void;

  // ── Examination system ──
  /** Academic sessions */
  saveAcademicSession: (s: AcademicSession) => void;
  /** Replaces every assignment for one teacher in a single pass. */
  setTeacherAssignments: (
    teacherId: string,
    pairs: { classId: string; subjectId: string }[],
    actor: AuditActor,
  ) => void;
  saveGradeScale: (scale: GradeScale, actor: AuditActor) => void;
  deleteGradeScale: (id: string) => void;
  saveExamGroup: (group: ExamGroup, actor: AuditActor) => void;
  deleteExamGroup: (id: string, actor: AuditActor) => void;
  setExamGroupStatus: (id: string, status: ExamGroup["status"], actor: AuditActor) => void;
  saveSubjectExams: (exams: SubjectExam[], actor: AuditActor) => void;
  deleteSubjectExam: (id: string, actor: AuditActor) => void;
  /** Draft save — never locks the sheet. */
  saveMarks: (sheet: ExamMarks, actor: AuditActor) => void;
  /** Final submit — locks the sheet against further teacher edits. */
  submitMarks: (sheet: ExamMarks, actor: AuditActor) => void;
  setMarksStatus: (
    examId: string,
    status: MarksSheetStatus,
    actor: AuditActor,
    reason?: string,
  ) => void;
  /** Writes the published snapshots and marks those classes live. */
  publishResults: (
    groupId: string,
    classIds: string[],
    results: StudentExamResult[],
    actor: AuditActor,
  ) => void;
  unpublishResults: (groupId: string, classIds: string[], actor: AuditActor) => void;
  recordReportCards: (records: ReportCardRecord[], actor: AuditActor) => void;
  logAudit: (entry: Omit<AuditLog, "id" | "at">) => void;
  pushNotification: (n: Omit<AppNotification, "id" | "at">) => void;
  markNotificationRead: (id: string, userId: string) => void;

  resetDemo: () => void;
  /** True while the initial data load is still in flight (Firebase mode). */
  loading: boolean;
  /** Per-collection outcome of the live Firestore read. */
  health: Record<string, CollectionHealth>;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * Works out what the signed-in user is allowed to listen to. The role comes
 * from the custom claim first (set server-side), then the `appUsers` profile,
 * and finally the Super Admin allowlist — the same order `auth.tsx` resolves in,
 * so a freshly-allowlisted Google admin is not left scopeless before a profile
 * document exists.
 */
async function resolveReadScope(fbUser: { uid: string; email: string | null }): Promise<ReadScope> {
  const empty: ReadScope = { role: null, studentIds: [] };
  try {
    const authUser = auth?.currentUser;
    const claims = authUser ? (await authUser.getIdTokenResult()).claims : {};
    const claimRole = claims.role as Role | undefined;
    const claimStaffId = claims.staffId as string | undefined;

    // Staff never need the student-id list, so skip the extra profile read.
    if (claimRole && claimRole !== "parent") {
      return { role: claimRole, staffId: claimStaffId, studentIds: [] };
    }

    const profile = await fetchDoc<{ role?: Role; studentIds?: string[]; staffId?: string }>(
      "appUsers",
      fbUser.uid,
    );
    const role = claimRole ?? profile?.role ?? null;
    if (role) {
      return {
        role,
        staffId: claimStaffId ?? profile?.staffId,
        studentIds: profile?.studentIds ?? [],
      };
    }
    // No claim and no profile — the Google Super Admin bootstrap.
    if (await isAllowedAdminEmail(fbUser.email)) {
      return { role: "superadmin", studentIds: [] };
    }
    return empty;
  } catch {
    return empty;
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  /** Bumped on every auth change so a stale profile read can't attach listeners. */
  const authGeneration = React.useRef(0);
  // `loading` is true while the first batch of data is still arriving, so the
  // UI can show a spinner instead of an empty state that looks like data loss.
  const [loading, setLoading] = useState(!isDemoMode);
  // Per-collection read outcome. Without this a denied or misconfigured read is
  // indistinguishable from "there is no data" — every dashboard just shows ₹0.
  const [health, setHealth] = useState<Record<string, CollectionHealth>>(pendingHealth);

  // Demo mode reads localStorage once. Firebase mode opens a live onSnapshot
  // listener per collection on sign-in, so edits from any session appear here
  // in real time; listeners are torn down on sign-out / user change.
  useEffect(() => {
    if (isDemoMode) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      setHydrated(true);
      setLoading(false);
      return;
    }
    if (!auth) {
      setHydrated(true);
      setLoading(false);
      return;
    }

    let collectionUnsubs: (() => void)[] = [];
    const teardown = () => {
      collectionUnsubs.forEach((u) => u());
      collectionUnsubs = [];
    };

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      teardown();
      // Invalidate any in-flight scope resolution, including on sign-out —
      // otherwise the previous user's listeners re-attach after teardown.
      authGeneration.current += 1;
      setHydrated(true);
      if (!fbUser) {
        setState(emptyState());
        setHealth(pendingHealth());
        setLoading(false);
        return;
      }
      // New user: clear stale data and stream the collections they can read.
      setState(emptyState());
      setHealth(pendingHealth());
      setLoading(true);
      const responded = new Set<string>();
      const markResponded = (key: string) => {
        responded.add(key);
        if (responded.size >= COLLECTION_KEYS.length) setLoading(false);
      };
      // Safety net so a never-firing listener can't pin the spinner forever.
      const safety = setTimeout(() => setLoading(false), 8000);
      collectionUnsubs.push(() => clearTimeout(safety));

      const generation = authGeneration.current;

      resolveReadScope(fbUser).then((scope) => {
        if (generation !== authGeneration.current) return;

        for (const key of COLLECTION_KEYS) {
          const constraints = COLLECTION_SCOPES[key]?.(scope) ?? [];
          if (constraints === "skip") {
            // Not denied — deliberately not read for this role.
            setHealth((h) => ({ ...h, [key]: { state: "ok" } }));
            markResponded(key);
            continue;
          }
          collectionUnsubs.push(
            subscribeCollection<{ id: string }>(
              key,
              (rows) => {
                setState((s) => ({ ...s, [key]: rows }));
                setHealth((h) => ({ ...h, [key]: { state: "ok" } }));
                markResponded(key);
              },
              (err) => {
                // Role-scoped reads (e.g. a parent reading `staff`) are denied —
                // that's expected. Everything else is a real fault, so record it:
                // the health banner and Admin → Settings surface it to the user.
                const code = (err as { code?: string })?.code;
                console.warn(`[firestore] live read of "${key}" unavailable:`, err?.message ?? err);
                setHealth((h) => ({
                  ...h,
                  [key]: { state: "error", code, message: err?.message ?? String(err) },
                }));
                markResponded(key);
              },
              constraints,
            ),
          );
        }
      });
    });

    return () => {
      teardown();
      unsub();
    };
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
      upsertDoc(String(name), v).catch((e) => {
        console.error(`[firestore] upsert ${String(name)}/${v.id} failed`, e);
        toast.error(`Couldn't save changes to ${String(name)}. ${e?.message ?? ""}`.trim());
      });
    };
    const eraseDoc = (name: keyof DataState, id: string) => {
      if (isDemoMode) return;
      removeDoc(String(name), id).catch((e) => {
        console.error(`[firestore] remove ${String(name)}/${id} failed`, e);
        toast.error(`Couldn't delete from ${String(name)}. ${e?.message ?? ""}`.trim());
      });
    };

    /** Appends to the examination audit trail. Never throws into the caller. */
    const writeAudit = ({
      actor, ...rest
    }: Omit<AuditLog, "id" | "at" | "actorId" | "actorName" | "actorRole"> & { actor: AuditActor }) => {
      const doc: AuditLog = {
        ...rest,
        id: uid("log"),
        at: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
      };
      setState((s) => ({ ...s, auditLogs: [doc, ...s.auditLogs] }));
      writeDoc("auditLogs", doc);
    };

    /** Replaces a marks sheet in place — one document per subject paper. */
    const upsertMarks = (sheet: ExamMarks) => {
      setState((s) => ({
        ...s,
        examMarks: [...s.examMarks.filter((m) => m.id !== sheet.id), sheet],
      }));
      writeDoc("examMarks", sheet);
    };

    return {
      ...state,
      loading,
      health,

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

      markStaffAttendance: (records) => {
        const keys = new Set(records.map((r) => `${r.staffId}|${r.date}`));
        const added = records.map((r) => ({ ...r, id: staffAttendanceId(r.staffId, r.date) }));
        const newIds = new Set(added.map((a) => a.id));
        // Records for the same day filed under a different id (e.g. written
        // before ids were deterministic) would otherwise come back on the next
        // snapshot and show as a duplicate row.
        const superseded = state.staffAttendance.filter(
          (a) => keys.has(`${a.staffId}|${a.date}`) && !newIds.has(a.id),
        );
        setState((s) => ({
          ...s,
          staffAttendance: [
            ...added,
            ...s.staffAttendance.filter((a) => !keys.has(`${a.staffId}|${a.date}`)),
          ],
        }));
        superseded.forEach((a) => eraseDoc("staffAttendance", a.id));
        added.forEach((a) => writeDoc("staffAttendance", a));
      },

      punchStaff: ({ staffId, date, kind, time }) => {
        const existing = state.staffAttendance.find((a) => a.staffId === staffId && a.date === date);
        const base: StaffAttendanceRecord = existing ?? {
          id: staffAttendanceId(staffId, date),
          staffId,
          date,
          status: "present" as AttendanceStatus,
          markedBy: "self",
        };
        // Punctuality follows from the punch, so a self check-in can't be
        // recorded as on time when it wasn't.
        const derived = statusFromCheckIn(time);
        const doc: StaffAttendanceRecord =
          kind === "in"
            ? {
                ...base,
                checkIn: time,
                status: derived?.status ?? base.status,
                lateBy: derived?.status === "late" ? derived.lateBy : undefined,
                markedBy: "self",
              }
            : { ...base, checkOut: time };

        setState((s) => ({
          ...s,
          staffAttendance: [
            doc,
            ...s.staffAttendance.filter((a) => !(a.staffId === staffId && a.date === date)),
          ],
        }));
        writeDoc("staffAttendance", doc);
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

      addFeeHead: (f) => {
        const doc = { ...f, id: uid("fh") };
        setState((s) => ({ ...s, feeHeads: [...s.feeHeads, doc] }));
        writeDoc("feeHeads", doc);
      },

      updateFeeHead: (id, p) => {
        setState((s) => ({
          ...s,
          feeHeads: s.feeHeads.map((f) => (f.id === id ? { ...f, ...p } : f)),
        }));
        writeDoc("feeHeads", { id, ...p });
      },

      deleteFeeHead: (id) => {
        setState((s) => ({ ...s, feeHeads: s.feeHeads.filter((f) => f.id !== id) }));
        eraseDoc("feeHeads", id);
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
        // to the same Firestore document. Never overwrite an existing student
        // with the same admission number — uniqueness is enforced here too.
        if (state.students.some((x) => x.admissionNo === st.admissionNo)) return;
        const id = `st-${st.admissionNo}`;
        const doc = { ...st, id };
        setState((s) =>
          s.students.some((x) => x.admissionNo === st.admissionNo) ? s : { ...s, students: [...s.students, doc] },
        );
        writeDoc("students", doc);
      },

      updateStudent: (id, p) => {
        setState((s) => ({
          ...s,
          students: s.students.map((st) => (st.id === id ? { ...st, ...p } : st)),
        }));
        writeDoc("students", { id, ...p });
      },

      deleteStudent: (id) => {
        setState((s) => ({ ...s, students: s.students.filter((st) => st.id !== id) }));
        eraseDoc("students", id);
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

      deleteStaff: (id) => {
        // Cascade: clear this staff as class teacher on any class they led.
        const orphanedClasses = state.classes.filter((c) => c.classTeacherId === id);
        setState((s) => ({
          ...s,
          staff: s.staff.filter((st) => st.id !== id),
          classes: s.classes.map((c) => (c.classTeacherId === id ? { ...c, classTeacherId: "" } : c)),
        }));
        eraseDoc("staff", id);
        orphanedClasses.forEach((c) => writeDoc("classes", { id: c.id, classTeacherId: "" }));
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

      // ── Examination system ─────────────────────────────────

      logAudit: (entry) => {
        const doc: AuditLog = { ...entry, id: uid("log"), at: new Date().toISOString() };
        setState((s) => ({ ...s, auditLogs: [doc, ...s.auditLogs] }));
        writeDoc("auditLogs", doc);
      },

      pushNotification: (n) => {
        const doc: AppNotification = { ...n, id: uid("ntf"), at: new Date().toISOString() };
        setState((s) => ({ ...s, notifications: [doc, ...s.notifications] }));
        writeDoc("notifications", doc);
      },

      markNotificationRead: (id, userId) => {
        const current = state.notifications.find((n) => n.id === id);
        if (!current || current.readBy?.includes(userId)) return;
        const readBy = [...(current.readBy ?? []), userId];
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, readBy } : n)),
        }));
        writeDoc("notifications", { id, readBy });
      },

      saveAcademicSession: (session) => {
        setState((s) => {
          // Only one session can be current; electing a new one demotes the rest.
          const others = session.isCurrent
            ? s.academicSessions.map((x) => ({ ...x, isCurrent: x.id === session.id }))
            : s.academicSessions;
          const exists = others.some((x) => x.id === session.id);
          return {
            ...s,
            academicSessions: exists
              ? others.map((x) => (x.id === session.id ? session : x))
              : [...others, session],
          };
        });
        writeDoc("academicSessions", session);
        if (session.isCurrent) {
          state.academicSessions
            .filter((x) => x.id !== session.id && x.isCurrent)
            .forEach((x) => writeDoc("academicSessions", { id: x.id, isCurrent: false }));
        }
      },

      setTeacherAssignments: (teacherId, pairs, actor) => {
        const previous = state.teacherAssignments.filter((a) => a.teacherId === teacherId);
        // Deterministic ids make the set idempotent: re-saving the same matrix
        // reuses the same documents instead of churning them.
        const next: TeacherAssignment[] = pairs.map((p) => ({
          id: `ta-${teacherId}-${p.classId}-${p.subjectId}`,
          teacherId,
          classId: p.classId,
          subjectId: p.subjectId,
          createdAt:
            previous.find((a) => a.classId === p.classId && a.subjectId === p.subjectId)?.createdAt
            ?? new Date().toISOString(),
          createdBy: actor.id,
        }));
        const nextIds = new Set(next.map((a) => a.id));
        const removed = previous.filter((a) => !nextIds.has(a.id));

        setState((s) => ({
          ...s,
          teacherAssignments: [
            ...s.teacherAssignments.filter((a) => a.teacherId !== teacherId),
            ...next,
          ],
        }));
        if (!isDemoMode) {
          upsertMany("teacherAssignments", next).catch((e) =>
            toast.error(`Couldn't save assignments. ${e?.message ?? ""}`.trim()),
          );
          removeMany("teacherAssignments", removed.map((a) => a.id)).catch(() => {});
        }

        const teacher = state.staff.find((s) => s.id === teacherId);
        writeAudit({
          action: "teacher.assignment-changed",
          entity: teacher?.name ?? teacherId,
          entityId: teacherId,
          actor,
          summary: `${next.length} class-subject assignment${next.length === 1 ? "" : "s"}`,
          before: `${previous.length} assignments`,
          after: `${next.length} assignments`,
        });
      },

      saveGradeScale: (scale, actor) => {
        const existed = state.gradeScales.some((g) => g.id === scale.id);
        setState((s) => ({
          ...s,
          gradeScales: existed
            ? s.gradeScales.map((g) => (g.id === scale.id ? scale : g))
            : [...s.gradeScales, scale],
        }));
        writeDoc("gradeScales", scale);
        writeAudit({
          action: existed ? "gradescale.updated" : "gradescale.created",
          entity: scale.name,
          entityId: scale.id,
          actor,
          summary: `${scale.bands.length} grade bands`,
        });
      },

      deleteGradeScale: (id) => {
        setState((s) => ({ ...s, gradeScales: s.gradeScales.filter((g) => g.id !== id) }));
        eraseDoc("gradeScales", id);
      },

      saveExamGroup: (group, actor) => {
        const existed = state.examGroups.some((g) => g.id === group.id);
        setState((s) => ({
          ...s,
          examGroups: existed
            ? s.examGroups.map((g) => (g.id === group.id ? group : g))
            : [...s.examGroups, group],
        }));
        writeDoc("examGroups", group);
        writeAudit({
          action: existed ? "exam.group-updated" : "exam.group-created",
          entity: group.name,
          entityId: group.id,
          actor,
          summary: `${group.classIds.length} classes · ${group.startDate} → ${group.endDate}`,
        });
      },

      deleteExamGroup: (id, actor) => {
        const group = state.examGroups.find((g) => g.id === id);
        const exams = state.subjectExams.filter((e) => e.groupId === id);
        const marks = state.examMarks.filter((m) => m.groupId === id);
        const results = state.studentResults.filter((r) => r.groupId === id);
        setState((s) => ({
          ...s,
          examGroups: s.examGroups.filter((g) => g.id !== id),
          subjectExams: s.subjectExams.filter((e) => e.groupId !== id),
          examMarks: s.examMarks.filter((m) => m.groupId !== id),
          studentResults: s.studentResults.filter((r) => r.groupId !== id),
        }));
        eraseDoc("examGroups", id);
        if (!isDemoMode) {
          removeMany("subjectExams", exams.map((e) => e.id)).catch(() => {});
          removeMany("examMarks", marks.map((m) => m.id)).catch(() => {});
          removeMany("studentResults", results.map((r) => r.id)).catch(() => {});
        }
        writeAudit({
          action: "exam.group-updated",
          entity: group?.name ?? id,
          entityId: id,
          actor,
          summary: `Deleted examination and ${exams.length} subject papers`,
          before: group?.name,
          after: "deleted",
        });
      },

      setExamGroupStatus: (id, status, actor) => {
        const group = state.examGroups.find((g) => g.id === id);
        setState((s) => ({
          ...s,
          examGroups: s.examGroups.map((g) => (g.id === id ? { ...g, status } : g)),
        }));
        writeDoc("examGroups", { id, status });
        writeAudit({
          action: "exam.status-changed",
          entity: group?.name ?? id,
          entityId: id,
          actor,
          summary: `Status → ${status}`,
          before: group?.status,
          after: status,
        });
      },

      saveSubjectExams: (exams, actor) => {
        if (exams.length === 0) return;
        const ids = new Set(exams.map((e) => e.id));
        setState((s) => ({
          ...s,
          subjectExams: [...s.subjectExams.filter((e) => !ids.has(e.id)), ...exams],
        }));
        if (!isDemoMode) {
          upsertMany("subjectExams", exams).catch((e) =>
            toast.error(`Couldn't save subject exams. ${e?.message ?? ""}`.trim()),
          );
        }
        const existedCount = exams.filter((e) =>
          state.subjectExams.some((x) => x.id === e.id),
        ).length;
        writeAudit({
          action: existedCount === exams.length ? "exam.subject-updated" : "exam.subject-created",
          entity: `${exams.length} subject paper${exams.length === 1 ? "" : "s"}`,
          entityId: exams[0].groupId,
          actor,
          summary: exams.map((e) => e.subjectId).join(", "),
        });
      },

      deleteSubjectExam: (id, actor) => {
        const exam = state.subjectExams.find((e) => e.id === id);
        const sheet = state.examMarks.find((m) => m.examId === id);
        setState((s) => ({
          ...s,
          subjectExams: s.subjectExams.filter((e) => e.id !== id),
          examMarks: s.examMarks.filter((m) => m.examId !== id),
        }));
        eraseDoc("subjectExams", id);
        if (sheet) eraseDoc("examMarks", sheet.id);
        writeAudit({
          action: "exam.subject-deleted",
          entity: exam?.subjectId ?? id,
          entityId: id,
          actor,
          summary: "Subject paper removed",
        });
      },

      saveMarks: (sheet, actor) => {
        const next: ExamMarks = { ...sheet, updatedAt: new Date().toISOString(), enteredBy: actor.id };
        upsertMarks(next);
        writeAudit({
          action: "marks.saved",
          entity: sheet.id,
          entityId: sheet.examId,
          actor,
          summary: `${Object.keys(next.entries).length} entries saved as draft`,
        });
      },

      submitMarks: (sheet, actor) => {
        const now = new Date().toISOString();
        const next: ExamMarks = {
          ...sheet,
          status: "submitted",
          submittedBy: actor.id,
          submittedAt: now,
          updatedAt: now,
          enteredBy: actor.id,
        };
        upsertMarks(next);
        writeAudit({
          action: "marks.submitted",
          entity: sheet.id,
          entityId: sheet.examId,
          actor,
          summary: `${Object.keys(next.entries).length} entries submitted and locked`,
          before: sheet.status,
          after: "submitted",
        });
      },

      setMarksStatus: (examId, status, actor, reason) => {
        const sheet = state.examMarks.find((m) => m.examId === examId);
        if (!sheet) return;
        const now = new Date().toISOString();
        const next: ExamMarks = {
          ...sheet,
          status,
          updatedAt: now,
          ...(status === "verified" ? { verifiedBy: actor.id, verifiedAt: now } : {}),
          ...(status === "draft"
            ? { reopenedBy: actor.id, reopenedAt: now, reopenReason: reason }
            : {}),
        };
        upsertMarks(next);
        writeAudit({
          action: status === "draft" ? "marks.reopened" : "marks.verified",
          entity: sheet.id,
          entityId: examId,
          actor,
          summary: status === "draft" ? `Reopened for editing${reason ? `: ${reason}` : ""}` : "Marks verified",
          before: sheet.status,
          after: status,
        });
      },

      publishResults: (groupId, classIds, results, actor) => {
        const group = state.examGroups.find((g) => g.id === groupId);
        const published = Array.from(new Set([...(group?.publishedClassIds ?? []), ...classIds]));
        const ids = new Set(results.map((r) => r.id));

        setState((s) => ({
          ...s,
          studentResults: [...s.studentResults.filter((r) => !ids.has(r.id)), ...results],
          examGroups: s.examGroups.map((g) =>
            g.id === groupId ? { ...g, publishedClassIds: published, status: "published" } : g,
          ),
        }));
        if (!isDemoMode) {
          upsertMany("studentResults", results).catch((e) =>
            toast.error(`Couldn't publish results. ${e?.message ?? ""}`.trim()),
          );
        }
        writeDoc("examGroups", { id: groupId, publishedClassIds: published, status: "published" });
        writeAudit({
          action: "result.published",
          entity: group?.name ?? groupId,
          entityId: groupId,
          actor,
          summary: `${results.length} results published across ${classIds.length} class${classIds.length === 1 ? "" : "es"}`,
          before: (group?.publishedClassIds ?? []).join(", ") || "none",
          after: published.join(", "),
        });
      },

      unpublishResults: (groupId, classIds, actor) => {
        const group = state.examGroups.find((g) => g.id === groupId);
        const drop = state.studentResults.filter(
          (r) => r.groupId === groupId && classIds.includes(r.classId),
        );
        const published = (group?.publishedClassIds ?? []).filter((c) => !classIds.includes(c));

        setState((s) => ({
          ...s,
          studentResults: s.studentResults.filter(
            (r) => !(r.groupId === groupId && classIds.includes(r.classId)),
          ),
          examGroups: s.examGroups.map((g) =>
            g.id === groupId
              ? { ...g, publishedClassIds: published, status: published.length ? g.status : "verification" }
              : g,
          ),
        }));
        if (!isDemoMode) {
          removeMany("studentResults", drop.map((r) => r.id)).catch(() => {});
        }
        writeDoc("examGroups", {
          id: groupId,
          publishedClassIds: published,
          ...(published.length ? {} : { status: "verification" as ExamGroup["status"] }),
        });
        writeAudit({
          action: "result.unpublished",
          entity: group?.name ?? groupId,
          entityId: groupId,
          actor,
          summary: `${drop.length} results withdrawn from ${classIds.length} class${classIds.length === 1 ? "" : "es"}`,
          before: (group?.publishedClassIds ?? []).join(", "),
          after: published.join(", ") || "none",
        });
      },

      recordReportCards: (records, actor) => {
        if (records.length === 0) return;
        const ids = new Set(records.map((r) => r.id));
        setState((s) => ({
          ...s,
          reportCards: [...s.reportCards.filter((r) => !ids.has(r.id)), ...records],
        }));
        if (!isDemoMode) {
          upsertMany("reportCards", records).catch(() => {});
        }
        writeAudit({
          action: "reportcard.generated",
          entity: `${records.length} report card${records.length === 1 ? "" : "s"}`,
          entityId: records[0].groupId,
          actor,
          summary: `Generated for ${records.length} student${records.length === 1 ? "" : "s"}`,
        });
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
  }, [state, loading, health]);

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
