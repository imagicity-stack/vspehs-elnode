// ─────────────────────────────────────────────────────────────
// El-Node — Domain Types
// ─────────────────────────────────────────────────────────────

export type Role = "parent" | "teacher" | "accountant" | "superadmin";

export interface Subject {
  id: string;
  /** Short uppercase code, e.g. "PHO", "NUM" */
  code: string;
  name: string;
  description?: string;
}

export type BloodGroup =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown";

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface PickupPerson {
  name: string;
  relation: string;
  phone: string;
  photoUrl?: string;
  /** Whether currently authorised for pickup */
  authorised: boolean;
}

export interface Sibling {
  name: string;
  /** Student id if studying in the same school */
  studentId?: string;
  className?: string;
  relation: "brother" | "sister";
}

export interface Student {
  id: string;
  /** 7-digit admission number used for parent login */
  admissionNo: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  gender: "male" | "female" | "other";
  dob: string; // ISO date
  bloodGroup: BloodGroup;
  classId: string;
  rollNo: number;
  allergies: string[];
  medicalNotes?: string;
  emergencyContacts: EmergencyContact[];
  pickupPersons: PickupPerson[];
  siblings: Sibling[];
  previousSchool?: string;
  address: string;
  fatherName: string;
  motherName: string;
  primaryContact: string;
  parentEmail?: string;
  admissionDate: string;
  transportRoute?: string;
  status: "active" | "inactive";
  /**
   * Firebase Auth uid of the parent login, written server-side once it exists.
   * Absent on records created before this was tracked, so treat a missing
   * value as "unknown", not as "no login" — ask the server to be sure.
   */
  parentAuthUid?: string;
}

/**
 * Levels the school runs, pre-primary through senior secondary. A class is a
 * level plus a section, so "Class 8" + "A" is the class commonly written 8A.
 */
export const CLASS_LEVELS = [
  "Playgroup", "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
  "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
] as const;

export type ClassLevel = (typeof CLASS_LEVELS)[number];

export interface SchoolClass {
  id: string;
  name: string; // e.g. "Nursery A", "Class 8 A"
  level: ClassLevel;
  section: string;
  classTeacherId: string;
  room: string;
  capacity: number;
}

export type StaffRole = "teacher" | "accountant" | "superadmin" | "helper";

export interface Staff {
  id: string;
  /** Employee ID printed on the ID card and shown in directories. */
  staffCode: string;
  name: string;
  email: string;
  role: StaffRole;
  photoUrl?: string;
  phone: string;
  qualification: string;
  specialisation?: string;
  experienceYears: number;
  joiningDate: string;
  dob: string;
  address: string;
  /**
   * Coarse class allocation, kept for attendance//updates scoping. Exam-grade
   * "which subject in which class" lives in `teacherAssignments` instead — a
   * cross-product of these two fields cannot express it.
   */
  assignedClassIds: string[];
  subjects: string[];
  salary?: number;
  status: "active" | "on-leave" | "inactive";
  /** Printed designation, e.g. "Senior Teacher". Falls back to the role. */
  designation?: string;
  department?: string;
  /** ID-card details */
  bloodGroup?: BloodGroup;
  emergencyContact?: string;
  emergencyPhone?: string;

  // ── Login account (written by the server, never by the client) ──
  /** Firebase Auth uid once a login has been provisioned. */
  authUid?: string;
  /** ISO datetime of the most recent successful sign-in. */
  lastLoginAt?: string;
  /** ISO datetime the account moved off the default password. */
  passwordChangedAt?: string;
  /**
   * True from the moment a login is created or reset until the member sets
   * their own password. Drives the forced first-login prompt.
   */
  mustChangePassword?: boolean;
  /** Set when an admin disables the login without deleting the record. */
  loginDisabled?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Academic structure
// ─────────────────────────────────────────────────────────────
// NOTE ON CLASSES AND SECTIONS
// A `SchoolClass` in this ERP already represents a class *and* its section
// ("Nursery A" = level "Nursery", section "A"), so what a CBSE school calls
// "Class 8A" is one SchoolClass document. Everything below therefore scopes by
// `classId`, which carries the section with it — there is no second section key
// to keep in step.

export interface AcademicSession {
  id: string;
  /** e.g. "2026-27" */
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

/**
 * One row per (teacher, class, subject). This is the authority on what a
 * teacher may see and mark — a teacher who teaches Maths to 8A and 9A but
 * Science only to 8A has three rows, which `assignedClassIds × subjects`
 * could never represent.
 */
export interface TeacherAssignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  sessionId?: string;
  createdAt: string;
  createdBy?: string;
}

// ─────────────────────────────────────────────────────────────
// Grading
// ─────────────────────────────────────────────────────────────

export interface GradeBand {
  minPercent: number;
  maxPercent: number;
  grade: string;
  gradePoint?: number;
  remark?: string;
}

export interface GradeScale {
  id: string;
  name: string;
  description?: string;
  bands: GradeBand[];
  active: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Examinations
// ─────────────────────────────────────────────────────────────

export type ExamGroupStatus =
  | "draft" | "scheduled" | "ongoing" | "marks-entry" | "verification" | "published" | "archived";

/** An examination session — "Half Yearly Examination 2026-27". */
export interface ExamGroup {
  id: string;
  name: string;
  sessionId: string;
  /** Snapshot of the session name, so a renamed session never rewrites history. */
  sessionName: string;
  classIds: string[];
  description?: string;
  startDate: string;
  endDate: string;
  /** Defaults suggested when a subject exam is created under this group. */
  defaultStartTime: string;
  defaultDurationMins: number;
  defaultMaxMarks: number;
  defaultPassingMarks: number;
  gradeScaleId?: string;
  resultDate?: string;
  status: ExamGroupStatus;
  /** Rank is opt-in per examination. */
  rankingEnabled: boolean;
  /** Classes whose results are live to parents. Publishing is class-wise. */
  publishedClassIds: string[];
  createdAt: string;
  createdBy: string;
}

/**
 * Assessment component. Only "theory" is used today; the field exists so
 * practical / internal-assessment marks can be added later without a reshape.
 */
export type ExamComponent = "theory" | "practical" | "internal" | "project";

/** One subject's paper for one class within an exam group. */
export interface SubjectExam {
  id: string;
  groupId: string;
  classId: string;
  subjectId: string;
  date: string;
  startTime: string;
  durationMins: number;
  maxMarks: number;
  passingMarks: number;
  /** Falls back to the group's scale when unset. */
  gradeScaleId?: string;
  syllabus?: string;
  instructions?: string;
  room?: string;
  /** Teacher responsible for marks entry. */
  evaluatorId?: string;
  marksDeadline?: string;
  /** Future-ready: component + weightage let a subject carry several papers. */
  component?: ExamComponent;
  weightage?: number;
  createdAt: string;
}

/** How a single student sat a single paper. */
export type MarkStatus = "present" | "absent" | "medical" | "exempted" | "not-appeared";

export interface MarkEntry {
  /** null for every non-numeric status. */
  marks: number | null;
  status: MarkStatus;
  remarks?: string;
}

export type MarksSheetStatus = "not-started" | "draft" | "submitted" | "verified" | "published";

/**
 * Marks for one subject exam, keyed by student id. One document per paper
 * (rather than per student) keeps a class's marks atomic: a teacher's submit
 * is a single write that cannot half-apply.
 */
export interface ExamMarks {
  id: string;
  examId: string;
  groupId: string;
  classId: string;
  subjectId: string;
  entries: Record<string, MarkEntry>;
  status: MarksSheetStatus;
  enteredBy?: string;
  submittedBy?: string;
  submittedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  /** Set when an admin unlocks a submitted sheet, with the reason. */
  reopenedBy?: string;
  reopenedAt?: string;
  reopenReason?: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Results — a published snapshot, never a live view
// ─────────────────────────────────────────────────────────────

export interface ResultSubjectLine {
  subjectId: string;
  /** Snapshot: renaming a subject later must not alter a published result. */
  subjectName: string;
  maxMarks: number;
  passingMarks: number;
  obtained: number | null;
  status: MarkStatus;
  percent: number;
  grade: string;
  gradePoint?: number;
  passed: boolean;
  remarks?: string;
}

/**
 * One student's result for one exam group, frozen at publication. Every field
 * a report card needs is captured here, so later edits to students, subjects,
 * staff or grade scales cannot rewrite an issued result.
 */
export interface StudentExamResult {
  id: string;
  groupId: string;
  groupName: string;
  sessionName: string;
  studentId: string;
  // Student snapshot
  studentName: string;
  admissionNo: string;
  rollNo: number;
  classId: string;
  className: string;
  fatherName: string;
  motherName: string;
  photoUrl?: string;
  // Academic record
  lines: ResultSubjectLine[];
  totalMax: number;
  totalObtained: number;
  percentage: number;
  overallGrade: string;
  passed: boolean;
  failedCount: number;
  rank?: number;
  attendanceRate?: number;
  classTeacherRemark?: string;
  principalRemark?: string;
  /** The grading rules in force at publication (business rule 10). */
  gradeScaleSnapshot: GradeBand[];
  gradeScaleName: string;
  publishedAt: string;
  publishedBy: string;
  /** Short code printed on the report card for verification. */
  verificationId: string;
}

/** Audit trail of report cards handed out. */
export interface ReportCardRecord {
  id: string;
  resultId: string;
  groupId: string;
  studentId: string;
  verificationId: string;
  generatedAt: string;
  generatedBy: string;
}

// ─────────────────────────────────────────────────────────────
// Audit & notifications
// ─────────────────────────────────────────────────────────────

export type AuditAction =
  | "teacher.login-created" | "teacher.login-disabled" | "teacher.login-enabled"
  | "teacher.password-reset" | "teacher.assignment-changed"
  | "exam.group-created" | "exam.group-updated" | "exam.status-changed"
  | "exam.subject-created" | "exam.subject-updated" | "exam.subject-deleted"
  | "gradescale.created" | "gradescale.updated"
  | "marks.saved" | "marks.submitted" | "marks.reopened" | "marks.verified"
  | "result.published" | "result.unpublished"
  | "reportcard.generated";

export interface AuditLog {
  id: string;
  action: AuditAction;
  /** Human-readable target, e.g. "Class 8A · Mathematics". */
  entity: string;
  entityId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  summary: string;
  before?: string;
  after?: string;
  /** ISO datetime */
  at: string;
}

export type NotificationAudience = "teachers" | "parents" | "admins" | "all";

export interface AppNotification {
  id: string;
  audience: NotificationAudience;
  /** Narrows a teacher notification to specific staff. */
  staffIds?: string[];
  /** Narrows a parent notification to specific classes. */
  classIds?: string[];
  title: string;
  body: string;
  category: "exam" | "marks" | "result" | "general";
  link?: string;
  at: string;
  readBy?: string[];
}

export type AttendanceStatus = "present" | "absent" | "late" | "half-day";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: AttendanceStatus;
  /** minutes late, when status === 'late' */
  lateBy?: number;
  markedBy: string; // staff id
  note?: string;
}

export interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: AttendanceStatus;
  /** Local "HH:mm" punch times */
  checkIn?: string;
  checkOut?: string;
  /** minutes past the grace period, when status === 'late' */
  lateBy?: number;
  note?: string;
  /** staff id of whoever marked it — or "self" for a self check-in */
  markedBy?: string;
}

export type FeeFrequency = "monthly" | "quarterly" | "annual" | "one-time";
export type FeeCategory =
  | "tuition" | "transport" | "activity" | "admission" | "exam" | "meal" | "other";

export interface FeeHead {
  id: string;
  name: string;
  category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  appliesTo: "all" | string[]; // class ids
}

export type InvoiceStatus = "paid" | "partial" | "pending" | "overdue";

export interface InvoiceLine {
  feeHeadId: string;
  name: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  period: string; // e.g. "Jun 2026" or "Q1 2026-27"
  lines: InvoiceLine[];
  discount: number;
  concessionId?: string;
  total: number;
  paid: number;
  dueDate: string;
  issuedDate: string;
  status: InvoiceStatus;
}

export type PaymentMethod = "cash" | "card" | "upi" | "netbanking" | "cheque";

export interface Payment {
  id: string;
  receiptNo: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  collectedBy: string; // staff id
  reference?: string;
}

export interface Concession {
  id: string;
  studentId: string;
  reason: "sibling" | "staff-ward" | "scholarship" | "financial-aid" | "other";
  type: "percent" | "flat";
  value: number;
  note?: string;
  approvedBy: string;
  validTill: string;
}

export interface DailyUpdate {
  id: string;
  studentId?: string; // when null/undefined it applies to whole class
  classId: string;
  date: string;
  mood: "happy" | "okay" | "tired" | "unwell";
  ate: "all" | "some" | "none";
  nap: "slept" | "rested" | "active";
  note: string;
  photoUrls: string[];
  postedBy: string;
}

export interface Homework {
  id: string;
  classId: string;
  title: string;
  subject: string;
  description: string;
  date: string;
  dueDate?: string;
  attachmentUrl?: string;
  postedBy: string;
}

export interface Circular {
  id: string;
  title: string;
  body: string;
  audience: "all" | "parents" | "staff" | string[]; // or class ids
  category: "notice" | "event" | "holiday" | "alert" | "newsletter";
  date: string;
  pinned?: boolean;
  postedBy: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  type: "event" | "holiday" | "exam" | "ptm" | "activity";
  description?: string;
}

export interface Exam {
  id: string;
  name: string; // e.g. "Term 1 Assessment"
  classId: string;
  date: string;
  /** Pre-primary uses grades/skills rather than marks */
  skills: string[];
  published: boolean;
}

export type Grade = "A+" | "A" | "B" | "C" | "Needs Support";

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  /** skill -> grade */
  grades: Record<string, Grade>;
  remark: string;
  teacherId: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  type: "casual" | "sick" | "earned" | "unpaid";
  from: string;
  to: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  appliedOn: string;
}

export interface TaskItem {
  id: string;
  staffId: string;
  date: string;
  title: string;
  category: "teaching" | "care" | "admin" | "safety";
  done: boolean;
}

export interface AppUser {
  uid: string;
  role: Role;
  displayName: string;
  email?: string;
  /** for parents: the linked student id(s) */
  studentIds?: string[];
  /** for staff: the staff id */
  staffId?: string;
  admissionNo?: string;
  photoUrl?: string;
}
