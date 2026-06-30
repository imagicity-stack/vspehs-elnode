// ─────────────────────────────────────────────────────────────
// El-Node — Mock data (removed)
// ─────────────────────────────────────────────────────────────
// All collections are empty. The app reads live data from Firebase
// (Firestore + Auth). See src/lib/firestore.ts for Firestore helpers.
// ─────────────────────────────────────────────────────────────

import {
  AttendanceRecord, Circular, SchoolClass, Concession, DailyUpdate, Exam,
  ExamResult, FeeHead, Homework, Invoice, LeaveRequest, Payment, SchoolEvent,
  Staff, StaffAttendanceRecord, Student, TaskItem,
} from "./types";

export const classes: SchoolClass[] = [];
export const staff: Staff[] = [];
export const students: Student[] = [];
export const feeHeads: FeeHead[] = [];
export const invoices: Invoice[] = [];
export const payments: Payment[] = [];
export const concessions: Concession[] = [];
export const attendance: AttendanceRecord[] = [];
export const staffAttendance: StaffAttendanceRecord[] = [];
export const dailyUpdates: DailyUpdate[] = [];
export const homework: Homework[] = [];
export const circulars: Circular[] = [];
export const events: SchoolEvent[] = [];
export const exams: Exam[] = [];
export const examResults: ExamResult[] = [];
export const leaveRequests: LeaveRequest[] = [];
export const taskItems: TaskItem[] = [];
