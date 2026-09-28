// ─────────────────────────────────────────────────────────────
// El-Node — Examination domain logic
// ─────────────────────────────────────────────────────────────
// Pure functions over the examination collections: grading, result
// computation, publish validation, progress tracking and analytics.
// Nothing here touches React or Firestore, so the same rules apply whether a
// result is previewed in the UI or frozen into a published snapshot.
// ─────────────────────────────────────────────────────────────

import {
  ExamGroup, ExamMarks, GradeBand, GradeScale, MarkEntry, MarkStatus, MarksSheetStatus,
  ResultSubjectLine, SchoolClass, Staff, Student, StudentExamResult, Subject, SubjectExam,
  TeacherAssignment,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Vocabulary
// ─────────────────────────────────────────────────────────────

export type Tone = "brand" | "green" | "amber" | "red" | "slate" | "violet" | "sky";

/**
 * How each mark status is counted.
 * • `counts`  — the paper contributes its maximum to the total.
 * • `credits` — the student is not treated as having failed it.
 * An absence still counts towards the total (scoring zero); a medical or
 * exempted paper drops out of the total altogether, so an exempted student
 * is not punished with a percentage computed against marks they never sat.
 */
export const MARK_STATUS_META: Record<
  MarkStatus,
  { label: string; short: string; tone: Tone; counts: boolean; credits: boolean; numeric: boolean }
> = {
  present: { label: "Present", short: "P", tone: "green", counts: true, credits: true, numeric: true },
  absent: { label: "Absent", short: "AB", tone: "red", counts: true, credits: false, numeric: false },
  "not-appeared": { label: "Not appeared", short: "NA", tone: "red", counts: true, credits: false, numeric: false },
  medical: { label: "Medical leave", short: "ML", tone: "sky", counts: false, credits: true, numeric: false },
  exempted: { label: "Exempted", short: "EX", tone: "violet", counts: false, credits: true, numeric: false },
};

export const MARK_STATUSES = Object.keys(MARK_STATUS_META) as MarkStatus[];

export const SHEET_STATUS_META: Record<MarksSheetStatus, { label: string; tone: Tone }> = {
  "not-started": { label: "Not started", tone: "slate" },
  draft: { label: "Draft", tone: "amber" },
  submitted: { label: "Submitted", tone: "brand" },
  verified: { label: "Verified", tone: "violet" },
  published: { label: "Published", tone: "green" },
};

export const GROUP_STATUS_META: Record<ExamGroup["status"], { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "slate" },
  scheduled: { label: "Scheduled", tone: "sky" },
  ongoing: { label: "Ongoing", tone: "brand" },
  "marks-entry": { label: "Marks entry", tone: "amber" },
  verification: { label: "Verification", tone: "violet" },
  published: { label: "Published", tone: "green" },
  archived: { label: "Archived", tone: "slate" },
};

/** The order a group moves through; used to offer the next sensible step. */
export const GROUP_FLOW: ExamGroup["status"][] = [
  "draft", "scheduled", "ongoing", "marks-entry", "verification", "published", "archived",
];

// ─────────────────────────────────────────────────────────────
// Grading
// ─────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The band a percentage falls into. Bands are inclusive at both ends. */
export function bandFor(percent: number, bands: GradeBand[]): GradeBand | undefined {
  const p = round2(percent);
  return [...bands]
    .sort((a, b) => b.minPercent - a.minPercent)
    .find((b) => p >= b.minPercent && p <= b.maxPercent);
}

/**
 * Reports gaps and overlaps in a scale. A scale that leaves 40.5% ungraded
 * silently produces blank grades on a report card, so this runs in the editor.
 */
export function validateBands(bands: GradeBand[]): string[] {
  const issues: string[] = [];
  const sorted = [...bands].sort((a, b) => a.minPercent - b.minPercent);
  sorted.forEach((b, i) => {
    if (b.minPercent > b.maxPercent) {
      issues.push(`"${b.grade || "?"}" has a minimum above its maximum.`);
    }
    if (!b.grade.trim()) issues.push(`A band (${b.minPercent}–${b.maxPercent}%) has no grade letter.`);
    const next = sorted[i + 1];
    if (!next) return;
    if (next.minPercent <= b.maxPercent) {
      issues.push(`"${b.grade}" and "${next.grade}" overlap at ${next.minPercent}%.`);
    } else if (next.minPercent > b.maxPercent + 1) {
      issues.push(`Nothing covers ${b.maxPercent}–${next.minPercent}%.`);
    }
  });
  if (sorted.length && sorted[0].minPercent > 0) issues.push(`Nothing covers 0–${sorted[0].minPercent}%.`);
  if (sorted.length && sorted[sorted.length - 1].maxPercent < 100) {
    issues.push(`Nothing covers ${sorted[sorted.length - 1].maxPercent}–100%.`);
  }
  return issues;
}

/** The scale a paper grades against: its own, else the group's default. */
export function scaleForExam(
  exam: SubjectExam | undefined,
  group: ExamGroup | undefined,
  scales: GradeScale[],
): GradeScale | undefined {
  const id = exam?.gradeScaleId || group?.gradeScaleId;
  return scales.find((s) => s.id === id) ?? scales.find((s) => s.active);
}

// ─────────────────────────────────────────────────────────────
// Marks sheets
// ─────────────────────────────────────────────────────────────

export const marksSheetId = (examId: string) => `marks-${examId}`;

export function blankSheet(exam: SubjectExam): ExamMarks {
  return {
    id: marksSheetId(exam.id),
    examId: exam.id,
    groupId: exam.groupId,
    classId: exam.classId,
    subjectId: exam.subjectId,
    entries: {},
    status: "not-started",
    updatedAt: new Date().toISOString(),
  };
}

export const sheetFor = (examId: string, sheets: ExamMarks[]) =>
  sheets.find((m) => m.examId === examId);

export const emptyEntry = (): MarkEntry => ({ marks: null, status: "present" });

/** A submitted sheet is locked to teachers until an admin reopens it. */
export const isSheetLocked = (sheet?: ExamMarks) =>
  sheet?.status === "submitted" || sheet?.status === "verified" || sheet?.status === "published";

/** How far along one paper's marks entry is. */
export function sheetProgress(sheet: ExamMarks | undefined, studentCount: number) {
  const entries = sheet ? Object.values(sheet.entries) : [];
  // A student is "entered" once they carry a numeric mark or a non-numeric
  // status that explains its absence — a blank row is not progress.
  const entered = entries.filter(
    (e) => (MARK_STATUS_META[e.status]?.numeric ? e.marks !== null : true),
  ).length;
  return {
    entered,
    total: studentCount,
    status: sheet?.status ?? ("not-started" as MarksSheetStatus),
    complete: studentCount > 0 && entered >= studentCount,
    percent: studentCount ? Math.round((entered / studentCount) * 100) : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Result computation
// ─────────────────────────────────────────────────────────────

export interface ComputeResultInput {
  group: ExamGroup;
  student: Student;
  cls?: SchoolClass;
  exams: SubjectExam[];
  sheets: ExamMarks[];
  subjects: Subject[];
  scales: GradeScale[];
  attendanceRate?: number;
  classTeacherRemark?: string;
  principalRemark?: string;
}

/**
 * Builds one student's result from the marks currently on record. The output
 * is the same shape that gets frozen at publication, so an admin previewing a
 * result sees exactly what the report card will say.
 */
export function computeStudentResult(input: ComputeResultInput): StudentExamResult {
  const {
    group, student, cls, exams, sheets, subjects, scales,
    attendanceRate, classTeacherRemark, principalRemark,
  } = input;

  const groupScale = scales.find((s) => s.id === group.gradeScaleId);
  const lines: ResultSubjectLine[] = exams.map((exam) => {
    const sheet = sheetFor(exam.id, sheets);
    const entry = sheet?.entries[student.id];
    const status: MarkStatus = entry?.status ?? "not-appeared";
    const meta = MARK_STATUS_META[status];
    const scale = scaleForExam(exam, group, scales);

    // A non-numeric status never carries marks; an absence scores zero.
    const obtained = meta.numeric ? entry?.marks ?? null : null;
    const effective = meta.counts ? obtained ?? 0 : 0;
    const percent = meta.counts && exam.maxMarks > 0 ? round2((effective / exam.maxMarks) * 100) : 0;
    const band = meta.counts ? bandFor(percent, scale?.bands ?? []) : undefined;

    return {
      subjectId: exam.subjectId,
      subjectName: subjects.find((s) => s.id === exam.subjectId)?.name ?? exam.subjectId,
      maxMarks: exam.maxMarks,
      passingMarks: exam.passingMarks,
      obtained,
      status,
      percent,
      grade: meta.counts ? band?.grade ?? "—" : meta.short,
      gradePoint: band?.gradePoint,
      passed: meta.credits && (!meta.counts || effective >= exam.passingMarks),
      remarks: entry?.remarks,
    };
  });

  const counted = lines.filter((l) => MARK_STATUS_META[l.status].counts);
  const totalMax = counted.reduce((s, l) => s + l.maxMarks, 0);
  const totalObtained = counted.reduce((s, l) => s + (l.obtained ?? 0), 0);
  const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;
  const overallBand = bandFor(percentage, groupScale?.bands ?? scales.find((s) => s.active)?.bands ?? []);
  const failedCount = lines.filter((l) => !l.passed).length;

  return {
    id: `res-${group.id}-${student.id}`,
    groupId: group.id,
    groupName: group.name,
    sessionName: group.sessionName,
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    admissionNo: student.admissionNo,
    rollNo: student.rollNo,
    classId: student.classId,
    className: cls?.name ?? "—",
    fatherName: student.fatherName,
    motherName: student.motherName,
    photoUrl: student.photoUrl,
    lines,
    totalMax,
    totalObtained,
    percentage,
    overallGrade: overallBand?.grade ?? "—",
    passed: counted.length > 0 && failedCount === 0,
    failedCount,
    attendanceRate,
    classTeacherRemark,
    principalRemark,
    gradeScaleSnapshot: groupScale?.bands ?? scales.find((s) => s.active)?.bands ?? [],
    gradeScaleName: groupScale?.name ?? scales.find((s) => s.active)?.name ?? "—",
    publishedAt: "",
    publishedBy: "",
    verificationId: verificationIdFor(group.id, student.id),
  };
}

/**
 * Short, stable code printed on a report card. Derived from the ids rather than
 * random, so regenerating a card reproduces the same code.
 */
export function verificationIdFor(groupId: string, studentId: string) {
  const seed = `${groupId}:${studentId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (seed.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  return `EL-${Math.abs(hash).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

/**
 * Ranks within a class by total marks. Equal totals share a rank and the next
 * rank skips accordingly (1, 2, 2, 4), which is how schools publish ties.
 */
export function assignRanks(results: StudentExamResult[]): StudentExamResult[] {
  const byClass = new Map<string, StudentExamResult[]>();
  for (const r of results) {
    const list = byClass.get(r.classId) ?? [];
    list.push(r);
    byClass.set(r.classId, list);
  }
  const ranked = new Map<string, number>();
  for (const list of Array.from(byClass.values())) {
    const sorted = [...list].sort((a, b) => b.totalObtained - a.totalObtained);
    let lastTotal: number | null = null;
    let lastRank = 0;
    sorted.forEach((r, i) => {
      // Only a student who actually sat papers is ranked.
      if (r.totalMax === 0) return;
      const rank = r.totalObtained === lastTotal ? lastRank : i + 1;
      ranked.set(r.id, rank);
      lastTotal = r.totalObtained;
      lastRank = rank;
    });
  }
  return results.map((r) => ({ ...r, rank: ranked.get(r.id) }));
}

// ─────────────────────────────────────────────────────────────
// Publish validation
// ─────────────────────────────────────────────────────────────

export interface ValidationIssue {
  /** `error` blocks publication unless the admin overrides it. */
  level: "error" | "warning";
  message: string;
}

/**
 * Everything standing between a class and a publishable result. Errors are
 * hard stops (missing or unsubmitted marks, impossible values); warnings are
 * things the admin should see but may legitimately publish through.
 */
export function validateClassForPublish(args: {
  cls: SchoolClass;
  exams: SubjectExam[];
  sheets: ExamMarks[];
  students: Student[];
  subjects: Subject[];
}): ValidationIssue[] {
  const { cls, exams, sheets, students, subjects } = args;
  const issues: ValidationIssue[] = [];
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;

  if (exams.length === 0) {
    issues.push({ level: "error", message: `${cls.name} has no subject papers in this examination.` });
    return issues;
  }
  if (students.length === 0) {
    issues.push({ level: "warning", message: `${cls.name} has no students enrolled.` });
    return issues;
  }

  for (const exam of exams) {
    const sheet = sheetFor(exam.id, sheets);
    const name = `${subjectName(exam.subjectId)} marks for ${cls.name}`;

    if (!sheet || sheet.status === "not-started") {
      issues.push({ level: "error", message: `${name} have not been entered.` });
      continue;
    }
    if (sheet.status === "draft") {
      issues.push({ level: "error", message: `${name} have not been submitted.` });
    }

    const missing = students.filter((st) => {
      const e = sheet.entries[st.id];
      return !e || (MARK_STATUS_META[e.status].numeric && e.marks === null);
    });
    if (missing.length > 0) {
      issues.push({
        level: "error",
        message: `${missing.length} student${missing.length === 1 ? " has" : "s have"} missing ${subjectName(exam.subjectId)} marks.`,
      });
    }

    const over = students.filter((st) => {
      const e = sheet.entries[st.id];
      return e?.marks !== null && e?.marks !== undefined && e.marks > exam.maxMarks;
    });
    if (over.length > 0) {
      issues.push({
        level: "error",
        message: `${over.length} student${over.length === 1 ? " has" : "s have"} ${subjectName(exam.subjectId)} marks above the maximum of ${exam.maxMarks}.`,
      });
    }

    const negative = students.filter((st) => {
      const e = sheet.entries[st.id];
      return typeof e?.marks === "number" && e.marks < 0;
    });
    if (negative.length > 0) {
      issues.push({
        level: "error",
        message: `${negative.length} ${subjectName(exam.subjectId)} mark${negative.length === 1 ? " is" : "s are"} negative.`,
      });
    }

    const absent = students.filter((st) => {
      const s = sheet.entries[st.id]?.status;
      return s === "absent" || s === "not-appeared";
    });
    if (absent.length > 0) {
      issues.push({
        level: "warning",
        message: `${absent.length} student${absent.length === 1 ? " was" : "s were"} absent for ${subjectName(exam.subjectId)}.`,
      });
    }
  }
  return issues;
}

export const hasBlockingIssues = (issues: ValidationIssue[]) =>
  issues.some((i) => i.level === "error");

// ─────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────

export interface SubjectAnalytics {
  entered: number;
  appeared: number;
  average: number;
  highest: number;
  lowest: number;
  passed: number;
  failed: number;
  passPercent: number;
  distribution: { grade: string; count: number }[];
}

/** Class performance for one paper. Only students who sat it are averaged. */
export function subjectAnalytics(
  exam: SubjectExam,
  sheet: ExamMarks | undefined,
  students: Student[],
  scale: GradeScale | undefined,
): SubjectAnalytics {
  const scored = students
    .map((st) => sheet?.entries[st.id])
    .filter((e): e is MarkEntry => !!e && e.status === "present" && typeof e.marks === "number");
  const values = scored.map((e) => e.marks as number);
  const appeared = values.length;
  const passed = values.filter((v) => v >= exam.passingMarks).length;

  const counts = new Map<string, number>();
  for (const band of scale?.bands ?? []) counts.set(band.grade, 0);
  for (const v of values) {
    const band = bandFor(exam.maxMarks ? (v / exam.maxMarks) * 100 : 0, scale?.bands ?? []);
    if (band) counts.set(band.grade, (counts.get(band.grade) ?? 0) + 1);
  }

  return {
    entered: sheet ? Object.keys(sheet.entries).length : 0,
    appeared,
    average: appeared ? round2(values.reduce((s, v) => s + v, 0) / appeared) : 0,
    highest: appeared ? Math.max(...values) : 0,
    lowest: appeared ? Math.min(...values) : 0,
    passed,
    failed: appeared - passed,
    passPercent: appeared ? Math.round((passed / appeared) * 100) : 0,
    // Highest band first, matching how a school reads a grade sheet.
    distribution: (scale?.bands ?? [])
      .slice()
      .sort((a, b) => b.minPercent - a.minPercent)
      .map((b) => ({ grade: b.grade, count: counts.get(b.grade) ?? 0 })),
  };
}

// ─────────────────────────────────────────────────────────────
// Teacher scope — the authority on what a teacher may see
// ─────────────────────────────────────────────────────────────

export interface TeacherScope {
  /** Classes the teacher teaches at least one subject in. */
  classIds: string[];
  subjectIds: string[];
  /** The exact (class, subject) pairs — the real permission set. */
  pairs: { classId: string; subjectId: string }[];
  has: (classId: string, subjectId: string) => boolean;
  teachesClass: (classId: string) => boolean;
}

export function teacherScope(teacherId: string, assignments: TeacherAssignment[]): TeacherScope {
  const mine = assignments.filter((a) => a.teacherId === teacherId);
  const pairs = mine.map((a) => ({ classId: a.classId, subjectId: a.subjectId }));
  const keys = new Set(pairs.map((p) => `${p.classId}|${p.subjectId}`));
  const classIds = Array.from(new Set(pairs.map((p) => p.classId)));
  return {
    classIds,
    subjectIds: Array.from(new Set(pairs.map((p) => p.subjectId))),
    pairs,
    has: (classId, subjectId) => keys.has(`${classId}|${subjectId}`),
    teachesClass: (classId) => classIds.includes(classId),
  };
}

/**
 * Whether this teacher may enter marks for a paper. Being named evaluator is
 * enough; otherwise the (class, subject) pair must be assigned to them.
 * Business rule 1 — a teacher must never mark an unassigned subject.
 */
export function canMark(exam: SubjectExam, teacherId: string, scope: TeacherScope) {
  if (exam.evaluatorId && exam.evaluatorId === teacherId) return true;
  if (exam.evaluatorId && exam.evaluatorId !== teacherId) return false;
  return scope.has(exam.classId, exam.subjectId);
}

/** Subjects offered by a class, inferred from who is assigned to teach it. */
export function subjectsForClass(
  classId: string,
  assignments: TeacherAssignment[],
  subjects: Subject[],
): Subject[] {
  const ids = new Set(
    assignments.filter((a) => a.classId === classId).map((a) => a.subjectId),
  );
  return subjects.filter((s) => ids.has(s.id));
}

/** The class teacher of a class, if one is set. */
export const classTeacherOf = (cls: SchoolClass | undefined, staff: Staff[]) =>
  cls ? staff.find((s) => s.id === cls.classTeacherId) : undefined;

/** True once a class's results are live to parents. */
export const isClassPublished = (group: ExamGroup | undefined, classId: string) =>
  !!group?.publishedClassIds?.includes(classId);
