// ─────────────────────────────────────────────────────────────
// El-Node — Seeded demo dataset
// ─────────────────────────────────────────────────────────────
// A realistic, self-contained dataset that powers DEMO MODE so the entire
// product is navigable without a Firebase backend. Dates are generated
// relative to "today" so dashboards always look current.
// ─────────────────────────────────────────────────────────────

import {
  AttendanceRecord, Circular, SchoolClass, Concession, DailyUpdate, Exam,
  ExamResult, FeeHead, Homework, Invoice, LeaveRequest, Payment, SchoolEvent,
  Staff, StaffAttendanceRecord, Student, TaskItem,
} from "./types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const dayOffset = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const monthLabel = (offset: number) => {
  const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
};

// ── Classes ──────────────────────────────────────────────────
export const classes: SchoolClass[] = [
  { id: "c-pg", name: "Playgroup", level: "Playgroup", section: "A", classTeacherId: "s-anita", room: "Sunflower Room", capacity: 18 },
  { id: "c-nur", name: "Nursery A", level: "Nursery", section: "A", classTeacherId: "s-anita", room: "Rainbow Room", capacity: 20 },
  { id: "c-lkg", name: "LKG A", level: "LKG", section: "A", classTeacherId: "s-priya", room: "Tulip Room", capacity: 22 },
  { id: "c-ukg", name: "UKG A", level: "UKG", section: "A", classTeacherId: "s-meera", room: "Lotus Room", capacity: 24 },
];

// ── Staff ────────────────────────────────────────────────────
export const staff: Staff[] = [
  {
    id: "s-anita", staffCode: "EMP-001", name: "Anita Sharma", email: "anita@elnode.school",
    role: "teacher", phone: "+91 98200 11001", qualification: "B.Ed, Montessori Diploma",
    specialisation: "Early Childhood Care", experienceYears: 8, joiningDate: "2019-06-10",
    dob: "1990-03-14", address: "12 Lotus Apartments, Pune", assignedClassIds: ["c-pg", "c-nur"],
    subjects: ["Circle Time", "Phonics", "Art"], salary: 38000, status: "active",
  },
  {
    id: "s-priya", staffCode: "EMP-002", name: "Priya Nair", email: "priya@elnode.school",
    role: "teacher", phone: "+91 98200 11002", qualification: "M.A, B.Ed",
    specialisation: "Language & Literacy", experienceYears: 6, joiningDate: "2020-07-01",
    dob: "1992-09-22", address: "44 Green Meadows, Pune", assignedClassIds: ["c-lkg"],
    subjects: ["English", "Story Time", "Rhymes"], salary: 36000, status: "active",
  },
  {
    id: "s-meera", staffCode: "EMP-003", name: "Meera Iyer", email: "meera@elnode.school",
    role: "teacher", phone: "+91 98200 11003", qualification: "B.Sc, B.Ed",
    specialisation: "Numeracy & EVS", experienceYears: 10, joiningDate: "2017-04-15",
    dob: "1988-11-05", address: "7 Hillview Society, Pune", assignedClassIds: ["c-ukg"],
    subjects: ["Numbers", "EVS", "Music"], salary: 42000, status: "active",
  },
  {
    id: "s-ravi", staffCode: "EMP-004", name: "Ravi Deshpande", email: "accounts@elnode.school",
    role: "accountant", phone: "+91 98200 11004", qualification: "B.Com, Tally Certified",
    experienceYears: 12, joiningDate: "2016-01-20", dob: "1985-06-30",
    address: "23 Shivaji Nagar, Pune", assignedClassIds: [], subjects: [], salary: 45000, status: "active",
  },
  {
    id: "s-admin", staffCode: "EMP-005", name: "Dr. Kavita Rao", email: "admin@elnode.school",
    role: "superadmin", phone: "+91 98200 11000", qualification: "Ph.D Education, M.Ed",
    specialisation: "School Leadership", experienceYears: 18, joiningDate: "2014-03-01",
    dob: "1979-01-12", address: "1 Principal Quarters, Pune", assignedClassIds: [], subjects: [],
    salary: 90000, status: "active",
  },
  {
    id: "s-suni", staffCode: "EMP-006", name: "Sunita Pawar", email: "sunita@elnode.school",
    role: "helper", phone: "+91 98200 11006", qualification: "Childcare Certificate",
    experienceYears: 5, joiningDate: "2021-06-01", dob: "1995-08-19",
    address: "9 Kothrud, Pune", assignedClassIds: ["c-pg", "c-nur"], subjects: [], salary: 18000, status: "active",
  },
];

// ── Students ─────────────────────────────────────────────────
// admissionNo is the 7-digit parent login.
export const students: Student[] = [
  {
    id: "st-1001", admissionNo: "2025001", firstName: "Aarav", lastName: "Mehta",
    gender: "male", dob: "2022-04-18", bloodGroup: "B+", classId: "c-pg", rollNo: 1,
    allergies: ["Peanuts"], medicalNotes: "Carries inhaler for mild asthma.",
    emergencyContacts: [
      { name: "Rohit Mehta", relation: "Father", phone: "+91 98765 40001" },
      { name: "Sneha Mehta", relation: "Mother", phone: "+91 98765 40002" },
    ],
    pickupPersons: [
      { name: "Rohit Mehta", relation: "Father", phone: "+91 98765 40001", authorised: true },
      { name: "Lata Mehta", relation: "Grandmother", phone: "+91 98765 40010", authorised: true },
    ],
    siblings: [{ name: "Anaya Mehta", studentId: "st-1004", className: "LKG A", relation: "sister" }],
    previousSchool: "—", address: "501 Palm Residency, Baner, Pune", fatherName: "Rohit Mehta",
    motherName: "Sneha Mehta", primaryContact: "+91 98765 40001", parentEmail: "rohit.mehta@example.com",
    admissionDate: "2025-04-01", transportRoute: "Route 2 — Baner", status: "active",
  },
  {
    id: "st-1002", admissionNo: "2025002", firstName: "Diya", lastName: "Kapoor",
    gender: "female", dob: "2022-07-09", bloodGroup: "O+", classId: "c-pg", rollNo: 2,
    allergies: [], emergencyContacts: [
      { name: "Vikram Kapoor", relation: "Father", phone: "+91 98765 40003" },
      { name: "Riya Kapoor", relation: "Mother", phone: "+91 98765 40004" },
    ],
    pickupPersons: [{ name: "Riya Kapoor", relation: "Mother", phone: "+91 98765 40004", authorised: true }],
    siblings: [], previousSchool: "Little Steps Daycare", address: "12 Orchid Towers, Aundh, Pune",
    fatherName: "Vikram Kapoor", motherName: "Riya Kapoor", primaryContact: "+91 98765 40004",
    parentEmail: "riya.kapoor@example.com", admissionDate: "2025-04-02", transportRoute: "Self", status: "active",
  },
  {
    id: "st-1003", admissionNo: "2025003", firstName: "Vivaan", lastName: "Sharma",
    gender: "male", dob: "2021-12-02", bloodGroup: "A+", classId: "c-nur", rollNo: 1,
    allergies: ["Dairy"], emergencyContacts: [
      { name: "Amit Sharma", relation: "Father", phone: "+91 98765 40005" },
    ],
    pickupPersons: [
      { name: "Amit Sharma", relation: "Father", phone: "+91 98765 40005", authorised: true },
      { name: "Driver — Ramesh", relation: "Transport", phone: "+91 98765 40050", authorised: true },
    ],
    siblings: [], previousSchool: "—", address: "88 Maple Court, Wakad, Pune",
    fatherName: "Amit Sharma", motherName: "Pooja Sharma", primaryContact: "+91 98765 40005",
    parentEmail: "amit.sharma@example.com", admissionDate: "2025-04-01", transportRoute: "Route 1 — Wakad", status: "active",
  },
  {
    id: "st-1004", admissionNo: "2025004", firstName: "Anaya", lastName: "Mehta",
    gender: "female", dob: "2021-09-25", bloodGroup: "B+", classId: "c-lkg", rollNo: 1,
    allergies: ["Peanuts"], emergencyContacts: [
      { name: "Rohit Mehta", relation: "Father", phone: "+91 98765 40001" },
    ],
    pickupPersons: [{ name: "Rohit Mehta", relation: "Father", phone: "+91 98765 40001", authorised: true }],
    siblings: [{ name: "Aarav Mehta", studentId: "st-1001", className: "Playgroup", relation: "brother" }],
    previousSchool: "—", address: "501 Palm Residency, Baner, Pune", fatherName: "Rohit Mehta",
    motherName: "Sneha Mehta", primaryContact: "+91 98765 40001", parentEmail: "rohit.mehta@example.com",
    admissionDate: "2024-04-01", transportRoute: "Route 2 — Baner", status: "active",
  },
  {
    id: "st-1005", admissionNo: "2025005", firstName: "Reyansh", lastName: "Gupta",
    gender: "male", dob: "2021-06-14", bloodGroup: "AB+", classId: "c-lkg", rollNo: 2,
    allergies: [], emergencyContacts: [
      { name: "Sanjay Gupta", relation: "Father", phone: "+91 98765 40006" },
    ],
    pickupPersons: [{ name: "Neha Gupta", relation: "Mother", phone: "+91 98765 40007", authorised: true }],
    siblings: [], previousSchool: "Tiny Tots", address: "34 Cedar Lane, Hinjewadi, Pune",
    fatherName: "Sanjay Gupta", motherName: "Neha Gupta", primaryContact: "+91 98765 40007",
    parentEmail: "neha.gupta@example.com", admissionDate: "2024-04-05", transportRoute: "Route 1 — Wakad", status: "active",
  },
  {
    id: "st-1006", admissionNo: "2025006", firstName: "Saanvi", lastName: "Patel",
    gender: "female", dob: "2020-11-30", bloodGroup: "O-", classId: "c-ukg", rollNo: 1,
    allergies: ["Eggs"], medicalNotes: "Lactose intolerant.",
    emergencyContacts: [{ name: "Kiran Patel", relation: "Mother", phone: "+91 98765 40008" }],
    pickupPersons: [{ name: "Kiran Patel", relation: "Mother", phone: "+91 98765 40008", authorised: true }],
    siblings: [], previousSchool: "Bright Beginnings", address: "77 Willow Heights, Balewadi, Pune",
    fatherName: "Nilesh Patel", motherName: "Kiran Patel", primaryContact: "+91 98765 40008",
    parentEmail: "kiran.patel@example.com", admissionDate: "2023-04-01", transportRoute: "Self", status: "active",
  },
  {
    id: "st-1007", admissionNo: "2025007", firstName: "Ishaan", lastName: "Reddy",
    gender: "male", dob: "2020-08-21", bloodGroup: "A-", classId: "c-ukg", rollNo: 2,
    allergies: [], emergencyContacts: [{ name: "Arjun Reddy", relation: "Father", phone: "+91 98765 40009" }],
    pickupPersons: [{ name: "Arjun Reddy", relation: "Father", phone: "+91 98765 40009", authorised: true }],
    siblings: [], previousSchool: "—", address: "5 Banyan Square, Baner, Pune",
    fatherName: "Arjun Reddy", motherName: "Divya Reddy", primaryContact: "+91 98765 40009",
    parentEmail: "arjun.reddy@example.com", admissionDate: "2023-04-03", transportRoute: "Route 2 — Baner", status: "active",
  },
  {
    id: "st-1008", admissionNo: "2025008", firstName: "Myra", lastName: "Joshi",
    gender: "female", dob: "2022-01-15", bloodGroup: "B-", classId: "c-nur", rollNo: 2,
    allergies: ["Gluten"], emergencyContacts: [{ name: "Rahul Joshi", relation: "Father", phone: "+91 98765 40011" }],
    pickupPersons: [{ name: "Rahul Joshi", relation: "Father", phone: "+91 98765 40011", authorised: true }],
    siblings: [], previousSchool: "—", address: "21 Rose Villa, Aundh, Pune",
    fatherName: "Rahul Joshi", motherName: "Sweta Joshi", primaryContact: "+91 98765 40011",
    parentEmail: "rahul.joshi@example.com", admissionDate: "2025-04-04", transportRoute: "Self", status: "active",
  },
];

// ── Fee heads ────────────────────────────────────────────────
export const feeHeads: FeeHead[] = [
  { id: "f-tui", name: "Tuition Fee", category: "tuition", frequency: "monthly", amount: 6500, appliesTo: "all" },
  { id: "f-trn", name: "Transport Fee", category: "transport", frequency: "monthly", amount: 1800, appliesTo: ["c-pg", "c-nur", "c-lkg", "c-ukg"] },
  { id: "f-act", name: "Activity & Materials", category: "activity", frequency: "quarterly", amount: 2400, appliesTo: "all" },
  { id: "f-meal", name: "Meal Plan", category: "meal", frequency: "monthly", amount: 1500, appliesTo: "all" },
  { id: "f-adm", name: "Admission Fee", category: "admission", frequency: "one-time", amount: 15000, appliesTo: "all" },
];

// ── Invoices ─────────────────────────────────────────────────
function makeInvoice(
  idx: number, studentId: string, period: string, withTransport: boolean,
  dueOffset: number, paid: number, discount = 0,
): Invoice {
  const lines = [
    { feeHeadId: "f-tui", name: "Tuition Fee", amount: 6500 },
    { feeHeadId: "f-meal", name: "Meal Plan", amount: 1500 },
    ...(withTransport ? [{ feeHeadId: "f-trn", name: "Transport Fee", amount: 1800 }] : []),
  ];
  const gross = lines.reduce((s, l) => s + l.amount, 0);
  const total = gross - discount;
  const status: Invoice["status"] =
    paid >= total ? "paid" : paid > 0 ? "partial" : dueOffset < 0 ? "overdue" : "pending";
  return {
    id: `inv-${idx}`, invoiceNo: `EL/26/${1000 + idx}`, studentId, period, lines,
    discount, total, paid, dueDate: dayOffset(dueOffset), issuedDate: dayOffset(dueOffset - 20), status,
  };
}

export const invoices: Invoice[] = [
  // Current month — mix of paid / pending / overdue
  makeInvoice(1, "st-1001", monthLabel(0), true, 6, 0),
  makeInvoice(2, "st-1002", monthLabel(0), false, 6, 8000),
  makeInvoice(3, "st-1003", monthLabel(0), true, 6, 9800),
  makeInvoice(4, "st-1004", monthLabel(0), true, 6, 0, 1500),
  makeInvoice(5, "st-1005", monthLabel(0), true, 6, 4000),
  makeInvoice(6, "st-1006", monthLabel(0), false, 6, 8000),
  makeInvoice(7, "st-1007", monthLabel(0), true, -4, 0),
  makeInvoice(8, "st-1008", monthLabel(0), false, -4, 0),
  // Previous month — mostly paid
  makeInvoice(9, "st-1001", monthLabel(-1), true, -24, 9800),
  makeInvoice(10, "st-1003", monthLabel(-1), true, -24, 9800),
  makeInvoice(11, "st-1006", monthLabel(-1), false, -24, 8000),
  makeInvoice(12, "st-1007", monthLabel(-1), true, -24, 9800),
];

// ── Payments / receipts ──────────────────────────────────────
export const payments: Payment[] = [
  { id: "pay-1", receiptNo: "RC-5001", invoiceId: "inv-2", studentId: "st-1002", amount: 8000, method: "upi", date: dayOffset(-2), collectedBy: "s-ravi", reference: "UPI/9921" },
  { id: "pay-2", receiptNo: "RC-5002", invoiceId: "inv-3", studentId: "st-1003", amount: 9800, method: "netbanking", date: dayOffset(-3), collectedBy: "s-ravi", reference: "NEFT/2231" },
  { id: "pay-3", receiptNo: "RC-5003", invoiceId: "inv-5", studentId: "st-1005", amount: 4000, method: "cash", date: dayOffset(-1), collectedBy: "s-ravi" },
  { id: "pay-4", receiptNo: "RC-5004", invoiceId: "inv-6", studentId: "st-1006", amount: 8000, method: "card", date: dayOffset(-5), collectedBy: "s-ravi", reference: "CARD/8841" },
  { id: "pay-5", receiptNo: "RC-4990", invoiceId: "inv-9", studentId: "st-1001", amount: 9800, method: "upi", date: dayOffset(-26), collectedBy: "s-ravi", reference: "UPI/7710" },
  { id: "pay-6", receiptNo: "RC-4991", invoiceId: "inv-10", studentId: "st-1003", amount: 9800, method: "upi", date: dayOffset(-25), collectedBy: "s-ravi", reference: "UPI/7711" },
  { id: "pay-7", receiptNo: "RC-4992", invoiceId: "inv-12", studentId: "st-1007", amount: 9800, method: "cheque", date: dayOffset(-23), collectedBy: "s-ravi", reference: "CHQ/00231" },
];

// ── Concessions ──────────────────────────────────────────────
export const concessions: Concession[] = [
  { id: "con-1", studentId: "st-1004", reason: "sibling", type: "percent", value: 15, note: "Second child concession (Aarav & Anaya).", approvedBy: "s-admin", validTill: dayOffset(300) },
  { id: "con-2", studentId: "st-1006", reason: "scholarship", type: "flat", value: 1000, note: "Merit scholarship.", approvedBy: "s-admin", validTill: dayOffset(180) },
];

// ── Attendance (last 10 school days, class-wise) ─────────────
function buildAttendance(): AttendanceRecord[] {
  const recs: AttendanceRecord[] = [];
  let n = 0;
  for (let d = 0; d < 12; d++) {
    const date = dayOffset(-d);
    const dow = new Date(date).getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    for (const st of students) {
      // deterministic-ish status
      const seed = (parseInt(st.id.replace(/\D/g, "")) + d) % 11;
      let status: AttendanceRecord["status"] = "present";
      let lateBy: number | undefined;
      if (seed === 0) status = "absent";
      else if (seed === 3) { status = "late"; lateBy = 15 + (d % 3) * 10; }
      else if (seed === 7 && d === 0) { status = "late"; lateBy = 10; }
      const teacher = classes.find((c) => c.id === st.classId)?.classTeacherId || "s-anita";
      recs.push({
        id: `att-${n++}`, studentId: st.id, classId: st.classId, date, status,
        lateBy, markedBy: teacher,
        note: status === "absent" ? "Parent informed — unwell." : undefined,
      });
    }
  }
  return recs;
}
export const attendance: AttendanceRecord[] = buildAttendance();

export const staffAttendance: StaffAttendanceRecord[] = staff.flatMap((s, i) => {
  const recs: StaffAttendanceRecord[] = [];
  for (let d = 0; d < 5; d++) {
    const date = dayOffset(-d);
    const dow = new Date(date).getDay();
    if (dow === 0 || dow === 6) continue;
    const late = (i + d) % 7 === 0;
    recs.push({
      id: `sa-${s.id}-${d}`, staffId: s.id, date,
      status: (i === 1 && d === 0) ? "absent" : late ? "late" : "present",
      checkIn: (i === 1 && d === 0) ? undefined : late ? "09:18" : "08:45",
      checkOut: (i === 1 && d === 0) ? undefined : "15:30",
    });
  }
  return recs;
});

// ── Daily updates (parent-facing) ────────────────────────────
export const dailyUpdates: DailyUpdate[] = [
  { id: "du-1", classId: "c-pg", date: dayOffset(0), mood: "happy", ate: "all", nap: "slept", note: "We explored colours with finger painting today and sang the rainbow song. Aarav loved mixing blue and yellow! 🎨", photoUrls: ["g1", "g2", "g3"], postedBy: "s-anita" },
  { id: "du-2", classId: "c-nur", date: dayOffset(0), mood: "okay", ate: "some", nap: "rested", note: "Sensory play with sand and water. Lots of giggles during bubble time! 🫧", photoUrls: ["g2", "g4"], postedBy: "s-anita" },
  { id: "du-3", classId: "c-lkg", date: dayOffset(0), mood: "happy", ate: "all", nap: "active", note: "Phonics: letter 'S'. The class practised tracing and we read 'The Snail and the Whale'. 📚", photoUrls: ["g3"], postedBy: "s-priya" },
  { id: "du-4", classId: "c-ukg", date: dayOffset(0), mood: "happy", ate: "all", nap: "active", note: "Numbers up to 20 and a fun shapes hunt around the classroom! 🔷", photoUrls: ["g1", "g5"], postedBy: "s-meera" },
  { id: "du-5", classId: "c-pg", date: dayOffset(-1), mood: "tired", ate: "some", nap: "slept", note: "A calm day with clay modelling and story time. 🧸", photoUrls: ["g4"], postedBy: "s-anita" },
  { id: "du-6", classId: "c-lkg", date: dayOffset(-1), mood: "happy", ate: "all", nap: "rested", note: "Music & movement — we danced to the freeze song! 💃", photoUrls: ["g5", "g2"], postedBy: "s-priya" },
];

// ── Homework / activity notes ────────────────────────────────
export const homework: Homework[] = [
  { id: "hw-1", classId: "c-lkg", title: "Trace the letter 'S'", subject: "Phonics", description: "Practise tracing 'S' on the worksheet (3 lines). Find 2 objects at home starting with 'S'.", date: dayOffset(0), dueDate: dayOffset(2), postedBy: "s-priya" },
  { id: "hw-2", classId: "c-ukg", title: "Count & colour 1–20", subject: "Numbers", description: "Colour the worksheet and count aloud with a parent.", date: dayOffset(0), dueDate: dayOffset(1), postedBy: "s-meera" },
  { id: "hw-3", classId: "c-nur", title: "Bring a red object", subject: "Show & Tell", description: "Bring one red object from home for tomorrow's colour day.", date: dayOffset(0), dueDate: dayOffset(1), postedBy: "s-anita" },
  { id: "hw-4", classId: "c-lkg", title: "Rhyme practice", subject: "Rhymes", description: "Recite 'Twinkle Twinkle' with actions.", date: dayOffset(-1), postedBy: "s-priya" },
];

// ── Circulars / notices ──────────────────────────────────────
export const circulars: Circular[] = [
  { id: "ci-1", title: "Annual Day — Save the Date! 🎉", body: "Our Annual Day 'Little Stars' will be held on the 18th. Costumes will be shared by class teachers. Parents are invited from 9:30 AM.", audience: "parents", category: "event", date: dayOffset(-1), pinned: true, postedBy: "s-admin" },
  { id: "ci-2", title: "Holiday Notice", body: "School will remain closed on the 4th on account of a public holiday.", audience: "all", category: "holiday", date: dayOffset(-2), postedBy: "s-admin" },
  { id: "ci-3", title: "Colour Day — Wear RED 🔴", body: "Tomorrow is Red Colour Day. Please send your child in something red and a red object for show & tell.", audience: "parents", category: "notice", date: dayOffset(0), postedBy: "s-anita" },
  { id: "ci-4", title: "Fee Reminder — Current Month", body: "A gentle reminder that fees for the current month are due. Kindly clear pending dues via the Parent Portal.", audience: "parents", category: "alert", date: dayOffset(0), postedBy: "s-ravi" },
  { id: "ci-5", title: "Parent–Teacher Meeting", body: "PTM for all classes is scheduled for the 25th. Slot booking opens on the portal next week.", audience: "parents", category: "event", date: dayOffset(-3), postedBy: "s-admin" },
];

// ── Events / calendar ────────────────────────────────────────
export const events: SchoolEvent[] = [
  { id: "ev-1", title: "Red Colour Day", date: dayOffset(1), type: "activity", description: "Dress in red!" },
  { id: "ev-2", title: "Public Holiday", date: dayOffset(5), type: "holiday" },
  { id: "ev-3", title: "Term 1 Assessment", date: dayOffset(8), type: "exam" },
  { id: "ev-4", title: "Annual Day — Little Stars", date: dayOffset(19), type: "event" },
  { id: "ev-5", title: "Parent–Teacher Meeting", date: dayOffset(26), type: "ptm" },
];

// ── Exams + results (skill-based for pre-primary) ───────────
const skillSet = ["Communication", "Motor Skills", "Social Skills", "Creativity", "Numeracy"];
export const exams: Exam[] = [
  { id: "ex-1", name: "Term 1 Progress Report", classId: "c-lkg", date: dayOffset(-5), skills: skillSet, published: true },
  { id: "ex-2", name: "Term 1 Progress Report", classId: "c-ukg", date: dayOffset(-5), skills: skillSet, published: true },
  { id: "ex-3", name: "Term 1 Progress Report", classId: "c-nur", date: dayOffset(-5), skills: skillSet, published: true },
  { id: "ex-4", name: "Term 1 Progress Report", classId: "c-pg", date: dayOffset(-5), skills: skillSet, published: false },
];

const grades = ["A+", "A", "B", "C"] as const;
function gradesFor(seed: number): Record<string, ExamResult["grades"][string]> {
  const g: Record<string, ExamResult["grades"][string]> = {};
  skillSet.forEach((sk, i) => { g[sk] = grades[(seed + i) % grades.length]; });
  return g;
}
export const examResults: ExamResult[] = students.map((st, i) => {
  const exam = exams.find((e) => e.classId === st.classId)!;
  return {
    id: `res-${st.id}`, examId: exam.id, studentId: st.id, grades: gradesFor(i + 1),
    remark: "A wonderful term! Shows great curiosity and is settling in beautifully with friends.",
    teacherId: classes.find((c) => c.id === st.classId)!.classTeacherId,
  };
});

// ── Leave requests ───────────────────────────────────────────
export const leaveRequests: LeaveRequest[] = [
  { id: "lv-1", staffId: "s-priya", type: "sick", from: dayOffset(-1), to: dayOffset(-1), reason: "Fever", status: "approved", appliedOn: dayOffset(-2) },
  { id: "lv-2", staffId: "s-meera", type: "casual", from: dayOffset(4), to: dayOffset(5), reason: "Family function", status: "pending", appliedOn: dayOffset(0) },
  { id: "lv-3", staffId: "s-suni", type: "earned", from: dayOffset(7), to: dayOffset(9), reason: "Personal travel", status: "pending", appliedOn: dayOffset(-1) },
];

// ── Daily task checklist (teacher) ───────────────────────────
export const taskItems: TaskItem[] = [
  { id: "tk-1", staffId: "s-anita", date: dayOffset(0), title: "Mark morning attendance", category: "admin", done: true },
  { id: "tk-2", staffId: "s-anita", date: dayOffset(0), title: "Sanitise play area", category: "safety", done: true },
  { id: "tk-3", staffId: "s-anita", date: dayOffset(0), title: "Post daily update with photos", category: "care", done: true },
  { id: "tk-4", staffId: "s-anita", date: dayOffset(0), title: "Circle time — colours", category: "teaching", done: false },
  { id: "tk-5", staffId: "s-anita", date: dayOffset(0), title: "Update allergy chart", category: "safety", done: false },
  { id: "tk-6", staffId: "s-priya", date: dayOffset(0), title: "Phonics worksheet prep", category: "teaching", done: true },
  { id: "tk-7", staffId: "s-priya", date: dayOffset(0), title: "Mark attendance", category: "admin", done: true },
  { id: "tk-8", staffId: "s-priya", date: dayOffset(0), title: "Post homework", category: "teaching", done: false },
];
