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
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "Nursery A"
  level: "Playgroup" | "Nursery" | "LKG" | "UKG";
  section: string;
  classTeacherId: string;
  room: string;
  capacity: number;
}

export type StaffRole = "teacher" | "accountant" | "superadmin" | "helper";

export interface Staff {
  id: string;
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
  assignedClassIds: string[];
  subjects: string[];
  salary?: number;
  status: "active" | "on-leave" | "inactive";
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
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
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
