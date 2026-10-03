"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useData } from "@/lib/store";
import { auth, isFirebaseConfigured, admissionNoToEmail, DEFAULT_PASSWORD } from "@/lib/firebase";
import { toast } from "@/components/Toast";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Card, Badge, Avatar, Table, Th, Td, Stat, EmptyState, Loading } from "@/components/ui";
import { fullName, ageFromDob, nextRollNo, rollNoClash, rollLabel } from "@/lib/utils";
import { BloodGroup, Student } from "@/lib/types";
import {
  Users, Plus, Search, X, Droplet, AlertTriangle, KeyRound, CheckCircle2,
  Loader2, Copy, ShieldCheck, Upload, Download, FileText, Edit2, Trash2, CreditCard,
} from "lucide-react";

/** Calls a protected admin route with the caller's ID token, keeping the body
 *  so a failure can report the server's own reason rather than a guess. */
async function callAdminJson(
  path: string, payload: unknown,
): Promise<{ ok: boolean; data?: any }> {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    return { ok: false, data: { error: "Firebase is not connected in this build." } };
  }
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch (e) {
    return { ok: false, data: { error: e instanceof Error ? e.message : "Request failed." } };
  }
}

// Same call for the places that only need to know whether it worked.
async function callAdmin(path: string, payload: unknown): Promise<boolean> {
  return (await callAdminJson(path, payload)).ok;
}

// ── CSV template ──────────────────────────────────────────────
// `class` takes the level/grade (e.g. "Nursery") and `section` the section
// letter (e.g. "A"); together they resolve to a class on import.
type ClassRef = { id: string; name: string; level: string; section: string };

const CSV_HEADERS = [
  "firstName", "lastName", "admissionNo", "rollNo", "gender",
  "dob", "bloodGroup", "class", "section",
  "fatherName", "motherName", "primaryContact", "allergies",
];

function downloadTemplate(sample?: { level: string; section: string }) {
  const example = [
    // rollNo may be left blank — the next free number in the class is used.
    "Aarav", "Mehta", "2025001", "1", "male",
    "2022-04-18", "B+", sample?.level || "Nursery", sample?.section || "A",
    "Rohit Mehta", "Sneha Mehta", "+91 98765 40001", "Peanuts",
  ];
  const csv = [CSV_HEADERS, example].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "elnode-students-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface ParsedRow {
  firstName: string; lastName: string; admissionNo: string;
  gender: Student["gender"]; dob: string; bloodGroup: BloodGroup;
  className: string; section: string; classId: string;
  /** 0 when the column was blank — the importer picks the next free number. */
  rollNo: number;
  fatherName: string; motherName: string;
  primaryContact: string; allergies: string[];
  _error?: string;
}

function parseCSV(text: string, existing: Set<string>, classes: ClassRef[]): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const seen = new Set<string>(); // admission numbers seen earlier in this file
  const available = classes.map((c) => `${c.level} ${c.section}`).join(", ") || "none — add classes first";
  return lines.slice(1).map((line, i) => {
    const vals = line.split(",").map((v) => v.trim());
    const get = (key: string) => vals[headers.indexOf(key)] ?? "";
    const admNo = get("admissionno");
    const classRaw = (get("class") || get("classname")).trim();
    const sectionRaw = get("section").trim();
    const fail = (msg: string): ParsedRow => ({
      firstName: "", lastName: "", admissionNo: admNo, gender: "male" as const,
      dob: "", bloodGroup: "Unknown" as BloodGroup, className: classRaw, section: sectionRaw,
      classId: "", rollNo: 0, fatherName: "", motherName: "", primaryContact: "", allergies: [],
      _error: `Row ${i + 2}: ${msg}`,
    });
    if (!/^\d{7}$/.test(admNo)) return fail(`Invalid 7-digit admission number "${admNo}"`);
    if (existing.has(admNo)) return fail(`Admission number ${admNo} is already enrolled`);
    if (seen.has(admNo)) return fail(`Admission number ${admNo} is duplicated in this file`);
    if (!classRaw) return fail("Class is required");

    // Resolve by level + section; fall back to full name / id for old files.
    const sameLevel = classes.filter((c) => c.level.toLowerCase() === classRaw.toLowerCase());
    let match: ClassRef | undefined;
    if (sameLevel.length) {
      if (sectionRaw) {
        match = sameLevel.find((c) => c.section.trim().toLowerCase() === sectionRaw.toLowerCase());
        if (!match) return fail(`Section "${sectionRaw}" not found for ${classRaw}. Sections: ${sameLevel.map((c) => c.section).join(", ")}`);
      } else if (sameLevel.length === 1) {
        match = sameLevel[0];
      } else {
        return fail(`Section is required for ${classRaw} (sections: ${sameLevel.map((c) => c.section).join(", ")})`);
      }
    } else {
      const combined = (sectionRaw ? `${classRaw} ${sectionRaw}` : classRaw).toLowerCase();
      match = classes.find((c) => c.name.toLowerCase() === classRaw.toLowerCase())
        ?? classes.find((c) => c.name.toLowerCase() === combined)
        ?? classes.find((c) => c.id === classRaw);
      if (!match) return fail(`Unknown class "${classRaw}${sectionRaw ? ` / ${sectionRaw}` : ""}". Available: ${available}`);
    }

    seen.add(admNo);
    return {
      firstName: get("firstname"), lastName: get("lastname"),
      admissionNo: admNo,
      gender: (get("gender") as Student["gender"]) || "male",
      dob: get("dob") || "2022-01-01",
      bloodGroup: (get("bloodgroup") as BloodGroup) || "Unknown",
      className: match.level, section: match.section, classId: match.id,
      rollNo: Math.max(0, Math.trunc(Number(get("rollno")) || 0)),
      fatherName: get("fathername"), motherName: get("mothername"),
      primaryContact: get("primarycontact"),
      allergies: get("allergies") ? get("allergies").split(";").map((a) => a.trim()).filter(Boolean) : [],
    };
  });
}

export default function AdminStudents() {
  const data = useData();
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // Students saved without a parent login, so the gap is visible from the
  // header rather than only surfacing when a parent fails to sign in.
  const missingLogins = data.students.filter((s) => !s.parentAuthUid).length;

  const rows = data.students
    .filter((s) => classId === "all" || s.classId === classId)
    .filter(
      (s) =>
        !q ||
        fullName(s).toLowerCase().includes(q.toLowerCase()) ||
        s.admissionNo.includes(q) ||
        String(s.rollNo ?? "") === q.trim(),
    )
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  const [resetCred, setResetCred] = useState<{ name: string; admissionNo: string; pin: string } | null>(null);

  const resetStudentPin = async (s: Student) => {
    if (!isFirebaseConfigured) {
      toast.info("PIN reset needs Firebase — not available in demo mode.");
      return;
    }
    if (!confirm(`Reset the parent password for ${fullName(s)} (${s.admissionNo}) back to "${DEFAULT_PASSWORD}"?`)) return;
    const pin = DEFAULT_PASSWORD;
    const ok = await callAdmin("/api/students/manage", { action: "reset", studentId: s.id, admissionNo: s.admissionNo, pin });
    if (ok) setResetCred({ name: fullName(s), admissionNo: s.admissionNo, pin });
    else toast.error(`Couldn't reset the PIN for ${fullName(s)} — check the parent login exists and Firebase Admin setup.`);
  };

  const removeStudent = async (s: Student) => {
    if (!confirm(`Delete ${fullName(s)} (${s.admissionNo})? This permanently removes the student and the parent login.`)) return;
    data.deleteStudent(s.id);
    if (isFirebaseConfigured) {
      const ok = await callAdmin("/api/students/manage", {
        action: "delete", studentId: s.id, admissionNo: s.admissionNo,
      });
      ok
        ? toast.success(`${fullName(s)} and the parent login were removed.`)
        : toast.error(`${fullName(s)}'s record was removed, but the parent login may still exist — check Firebase Admin setup.`);
    } else {
      toast.success(`${fullName(s)} removed.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">Directory of all enrolled children.</p>
        </div>
        <div className="flex gap-2">
          {isFirebaseConfigured && (
            <button
              onClick={() => setRepairOpen(true)}
              className="btn-ghost"
              title="Create the Firebase login for any student that was saved without one"
            >
              <ShieldCheck className="h-4 w-4" /> Fix parent logins
              {missingLogins > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                  {missingLogins}
                </span>
              )}
            </button>
          )}
          <button onClick={() => setBulkOpen(true)} className="btn-ghost">
            <Upload className="h-4 w-4" /> Bulk Upload
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Student
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total" value={data.students.length} tone="brand" icon={<Users className="h-5 w-5" />} />
        <Stat label="Boys" value={data.students.filter((s) => s.gender === "male").length} tone="sky" icon={<Users className="h-5 w-5" />} />
        <Stat label="Girls" value={data.students.filter((s) => s.gender === "female").length} tone="violet" icon={<Users className="h-5 w-5" />} />
        <Stat label="With Allergies" value={data.students.filter((s) => s.allergies.length).length} tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setClassId("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${classId === "all" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              All
            </button>
            {data.classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setClassId(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${classId === c.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or admission no…"
              className="input pl-9 sm:w-64"
            />
          </div>
        </div>

        {data.loading && data.students.length === 0 ? (
          <Loading label="Loading students…" />
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={data.students.length === 0 ? "No students yet" : "No students match"}
              hint={data.students.length === 0 ? 'Add students individually or use "Bulk Upload" to import from CSV.' : undefined}
            />
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Student</Th><Th>Admission</Th><Th>Roll</Th><Th>Class</Th><Th>Age</Th>
                <Th>Blood</Th><Th>Allergies</Th><Th>Contact</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((s) => {
                const cls = data.classes.find((c) => c.id === s.classId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(s)} src={s.photoUrl} size={34} />
                        <span className="font-medium text-slate-800">{fullName(s)}</span>
                      </div>
                    </Td>
                    <Td className="text-slate-500">{s.admissionNo}</Td>
                    <Td className="font-semibold text-slate-700">{rollLabel(s.rollNo)}</Td>
                    <Td>{cls?.name ?? <span className="text-slate-300">—</span>}</Td>
                    <Td>{ageFromDob(s.dob)}</Td>
                    <Td><Badge tone="slate"><Droplet className="h-3.5 w-3.5" /> {s.bloodGroup}</Badge></Td>
                    <Td>{s.allergies.length ? <Badge tone="red">{s.allergies.join(", ")}</Badge> : <span className="text-slate-300">—</span>}</Td>
                    <Td className="text-slate-500">{s.primaryContact}</Td>
                    <Td><Badge tone={s.status === "active" ? "green" : "slate"}>{s.status}</Badge></Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/id-cards?student=${s.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                          title="ID card"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setEditStudent(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                          title="Edit student"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => resetStudentPin(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          title="Reset parent PIN"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeStudent(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {addOpen && <AddStudentModal onClose={() => setAddOpen(false)} />}
      {bulkOpen && <BulkUploadModal onClose={() => setBulkOpen(false)} />}
      {repairOpen && <RepairLoginsModal onClose={() => setRepairOpen(false)} />}
      {editStudent && <EditStudentModal student={editStudent} onClose={() => setEditStudent(null)} />}
      {resetCred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setResetCred(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <button onClick={() => setResetCred(null)} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600"><KeyRound className="h-7 w-7" /></div>
              <h3 className="text-lg font-bold text-slate-900">Parent password reset</h3>
              <p className="mt-1 text-sm text-slate-500">{resetCred.name}&apos;s parent login is back to the default.</p>
            </div>
            <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <CredRow icon={<KeyRound className="h-4 w-4" />} label="Admission no. (login)" value={resetCred.admissionNo} />
              <CredRow icon={<ShieldCheck className="h-4 w-4" />} label="Default password" value={resetCred.pin} />
            </div>
            <button onClick={() => setResetCred(null)} className="btn-primary mt-5 w-full py-3">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bulk Upload Modal ─────────────────────────────────────────
// ── Repair parent logins ──────────────────────────────────────
// A student can end up saved without a parent login: the record is written to
// Firestore first, so anything that stops the Auth account — a bad token, a
// server that is not yet redeployed, a transient Admin SDK error — leaves the
// child in the directory with no way for the parent to sign in. `create` then
// refuses with 409 because the record exists, so before this the only repair
// was to delete and re-add the student. This runs the idempotent `create-login`
// action over them instead: an account that already exists is re-synced, never
// duplicated, so the pass is safe to repeat.
function RepairLoginsModal({ onClose }: { onClose: () => void }) {
  const data = useData();
  // `parentAuthUid` is only written by newer server code, so a student missing
  // it may still have a perfectly good login — the pass proves it either way.
  const unrecorded = data.students.filter((s) => !s.parentAuthUid);
  const [allStudents, setAllStudents] = useState(unrecorded.length === 0);
  const targets = allStudents ? data.students : unrecorded;

  const [phase, setPhase] = useState<"confirm" | "running" | "done">("confirm");
  const [progress, setProgress] = useState(0);
  const [tally, setTally] = useState({ created: 0, existed: 0, failed: 0, reason: "" });

  const run = async () => {
    setPhase("running");
    const queue = [...targets];
    let created = 0, existed = 0, failed = 0, reason = "";
    let seen = 0;

    // A handful at a time: sequential is far too slow for a full school, and
    // all-at-once trips the Admin SDK's own rate limits.
    const worker = async () => {
      for (;;) {
        const s = queue.shift();
        if (!s) return;
        const { ok, data: body } = await callAdminJson("/api/students/manage", {
          action: "create-login", studentId: s.id, admissionNo: s.admissionNo, pin: DEFAULT_PASSWORD,
        });
        if (ok) { if (body?.existed) existed++; else created++; }
        else {
          failed++;
          if (!reason) reason = body?.detail || body?.error || "The server did not say why.";
        }
        setProgress(++seen);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));

    setTally({ created, existed, failed, reason });
    setPhase("done");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={phase === "running" ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-soft">
        {phase === "confirm" && (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Fix parent logins</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Creates the missing Firebase login for students already in the directory.
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!isFirebaseConfigured ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                Demo mode — parent logins live in Firebase, so there is nothing to repair here.
              </p>
            ) : (
              <>
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">{unrecorded.length}</span> of{" "}
                    {data.students.length} student{data.students.length !== 1 ? "s" : ""} have no parent login
                    on record.
                  </p>
                  <p className="mt-2 text-xs">
                    Every child is checked against Firebase. A login that already exists is left alone and
                    simply recorded, so running this is safe and can be repeated. Passwords are never changed —
                    new logins start on{" "}
                    <span className="font-mono font-semibold">{DEFAULT_PASSWORD}</span>.
                  </p>
                </div>

                <label className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={allStudents}
                    onChange={(e) => setAllStudents(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    Check all {data.students.length} students
                    <span className="block text-xs text-slate-400">
                      Slower, but confirms every parent can sign in — not just the ones flagged above.
                    </span>
                  </span>
                </label>

                <div className="mt-5 flex gap-2">
                  <button onClick={onClose} className="btn-ghost flex-1 py-3">Cancel</button>
                  <button onClick={run} disabled={!targets.length} className="btn-primary flex-1 py-3">
                    <ShieldCheck className="h-4 w-4" />
                    Check {targets.length} student{targets.length !== 1 ? "s" : ""}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {phase === "running" && (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" />
            <p className="mt-4 font-semibold text-slate-900">
              Checking {progress} of {targets.length}…
            </p>
            <div className="mx-auto mt-3 h-2 w-64 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${targets.length ? (progress / targets.length) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">Leave this open until it finishes.</p>
          </div>
        )}

        {phase === "done" && (
          <div className="text-center">
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
              tally.failed ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
              {tally.failed ? <AlertTriangle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {tally.failed ? "Finished with some failures" : "All parent logins are in place"}
            </h3>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xl font-bold text-emerald-700">{tally.created}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Created</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{tally.existed}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Already had one</p>
              </div>
              <div className={`rounded-xl p-3 ${tally.failed ? "bg-rose-50" : "bg-slate-50"}`}>
                <p className={`text-xl font-bold ${tally.failed ? "text-rose-700" : "text-slate-700"}`}>{tally.failed}</p>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${tally.failed ? "text-rose-600" : "text-slate-500"}`}>Failed</p>
              </div>
            </div>

            {tally.created > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                New logins use the admission number with the password{" "}
                <span className="font-mono font-semibold">{DEFAULT_PASSWORD}</span>.
              </p>
            )}
            {tally.failed > 0 && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-left text-xs text-rose-700">
                <p className="font-semibold">The server reported:</p>
                <p className="mt-1">{tally.reason}</p>
              </div>
            )}

            <button onClick={onClose} className="btn-primary mt-5 w-full py-3">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [provisioned, setProvisioned] = useState(0);
  const [failReason, setFailReason] = useState("");
  const [reassigned, setReassigned] = useState(0);
  const [duplicates, setDuplicates] = useState(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const existing = new Set(data.students.map((s) => s.admissionNo));
    const reader = new FileReader();
    reader.onload = (ev) => setRows(parseCSV(ev.target?.result as string, existing, data.classes));
    reader.readAsText(file);
  };

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  const importAll = async () => {
    setImporting(true);

    // Roll numbers the file asked for are honoured; the rest get the next free
    // number in their class. Taken numbers are tracked here because state does
    // not update mid-loop, so a batch cannot hand out the same one twice.
    const takenRolls: Record<string, Set<number>> = {};
    const claim = (classId: string, n: number) => {
      (takenRolls[classId] ??= new Set()).add(n);
      return n;
    };
    data.students.forEach((s) => { if (s.rollNo) claim(s.classId, s.rollNo); });
    const nextFreeRoll = (classId: string) => {
      const taken = takenRolls[classId] ??= new Set();
      let n = 1;
      while (taken.has(n)) n++;
      return claim(classId, n);
    };

    // When Firebase is live, provision each parent login + Firestore docs via
    // the same protected route the single "Add Student" flow uses.
    let token: string | null = null;
    if (isFirebaseConfigured && auth?.currentUser) {
      try { token = await auth.currentUser.getIdToken(); } catch { token = null; }
    }

    // Guard against duplicates within this batch even if two rows slipped
    // through (e.g. differing whitespace) — track numbers as we go.
    const usedNumbers = new Set(data.students.map((s) => s.admissionNo));
    let created = 0;   // parent logins provisioned
    let duplicates = 0; // rejected as duplicate (server 409 or seen in batch)
    let firstFailure = ""; // the server's own words for the first failed row
    let rollsReassigned = 0; // rows whose requested roll number was already taken
    const today = new Date().toISOString().slice(0, 10);
    for (const row of validRows) {
      if (usedNumbers.has(row.admissionNo)) { duplicates++; continue; }
      // A number the file asked for is kept unless the class already has it.
      const wanted = row.rollNo;
      const rollNo = wanted && !takenRolls[row.classId]?.has(wanted)
        ? claim(row.classId, wanted)
        : nextFreeRoll(row.classId);
      if (wanted && wanted !== rollNo) rollsReassigned++;
      const student: Student = {
        id: `st-${row.admissionNo}`,
        admissionNo: row.admissionNo, firstName: row.firstName, lastName: row.lastName,
        gender: row.gender, dob: row.dob, bloodGroup: row.bloodGroup,
        classId: row.classId, rollNo,
        allergies: row.allergies,
        emergencyContacts: [{ name: row.fatherName || "Parent", relation: "Father", phone: row.primaryContact }],
        pickupPersons: [{ name: row.fatherName || "Parent", relation: "Father", phone: row.primaryContact, authorised: true }],
        siblings: [], address: "—", fatherName: row.fatherName, motherName: row.motherName,
        primaryContact: row.primaryContact,
        admissionDate: today, transportRoute: "Self", status: "active",
      };

      // Firebase mode: the server decides — a 409 means duplicate, so skip it.
      if (token) {
        try {
          const res = await fetch("/api/students/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            // Everyone starts on the shared default password; parents change it later.
            body: JSON.stringify({ student, pin: DEFAULT_PASSWORD }),
          });
          if (res.status === 409) { duplicates++; continue; }
          if (res.ok) created++;
          // Keep the first real reason: every row usually fails the same way,
          // so one accurate sentence beats a guess about Admin SDK env vars.
          else if (!firstFailure) {
            const detail = await res.json().catch(() => ({}));
            firstFailure = detail?.detail || detail?.error || `The server replied ${res.status}.`;
          }
        } catch (e) {
          if (!firstFailure) firstFailure = e instanceof Error ? e.message : "The request failed.";
        }
      }

      const { id: _id, ...withoutId } = student;
      data.addStudent(withoutId);
      usedNumbers.add(row.admissionNo);
    }

    setProvisioned(created);
    setReassigned(rollsReassigned);
    setFailReason(firstFailure);
    setDuplicates(duplicates);
    setImporting(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Import complete</h3>
          <p className="mt-1 text-sm text-slate-500">
            {validRows.length - duplicates} student{validRows.length - duplicates !== 1 ? "s" : ""} added successfully.
            {duplicates > 0 && (
              <span className="mt-1 block text-amber-600">
                {duplicates} skipped — admission number already exists.
              </span>
            )}
            {reassigned > 0 && (
              <span className="mt-1 block text-amber-600">
                {reassigned} roll number{reassigned !== 1 ? "s were" : " was"} already taken in that class —
                the next free number was used instead.
              </span>
            )}
          </p>
          {isFirebaseConfigured ? (
            <p className="mt-2 text-xs text-slate-500">
              {provisioned} parent login{provisioned !== 1 ? "s" : ""} provisioned
              {" "}(login = admission number, password = <span className="font-mono">{DEFAULT_PASSWORD}</span>).
              {provisioned < validRows.length - duplicates && (
                <span className="mt-2 block rounded-lg bg-amber-50 p-2 text-left text-amber-700">
                  <span className="font-semibold">
                    {validRows.length - duplicates - provisioned} login
                    {validRows.length - duplicates - provisioned !== 1 ? "s" : ""} could not be created.
                  </span>
                  <span className="mt-1 block">{failReason || "The server did not say why."}</span>
                  <span className="mt-1 block">
                    The students were saved. Use <span className="font-semibold">Fix parent logins</span> on
                    the Students page to retry once the cause is resolved.
                  </span>
                </span>
              )}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-600">
              Demo mode — saved to this browser only. Configure Firebase to persist and create parent logins.
            </p>
          )}
          <button onClick={onClose} className="btn-primary mt-5 w-full py-3">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">Bulk Upload Students</h3>
        <p className="mt-1 text-sm text-slate-500">Download the template, fill it in, then upload the CSV.</p>

        {/* Step 1 */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Step 1 — Download template</p>
              <p className="mt-0.5 text-xs text-slate-500">CSV with all required column headers.</p>
            </div>
            <button
              onClick={() => downloadTemplate(data.classes[0] && { level: data.classes[0].level, section: data.classes[0].section })}
              className="btn-ghost shrink-0"
            >
              <Download className="h-4 w-4" /> Template CSV
            </button>
          </div>
          {data.classes.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Available <code>class</code> + <code>section</code> values:</p>
              <div className="flex flex-wrap gap-2">
                {data.classes.map((c) => (
                  <span key={c.id} className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {c.level} <span className="text-brand-400">·</span> {c.section}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
            <strong>Tips:</strong> Put the level in <code>class</code> (e.g. <code>Nursery</code>) and the section in <code>section</code> (e.g. <code>A</code>).
            Use <code>;</code> to separate multiple allergies (e.g. <code>Peanuts;Dairy</code>).
            Date: <code>YYYY-MM-DD</code>. Gender: <code>male</code> / <code>female</code> / <code>other</code>.
          </div>
        </div>

        {/* Step 2 */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Step 2 — Upload your CSV</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 hover:border-brand-400 hover:bg-brand-50"
          >
            <FileText className="h-8 w-8 text-slate-300" />
            <span className="text-sm font-semibold text-slate-600">Click to choose CSV file</span>
            <span className="text-xs text-slate-400">UTF-8 encoded, max 500 rows</span>
          </button>
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-800">
              Preview — {rows.length} row{rows.length !== 1 ? "s" : ""}
              {errorRows.length > 0 && (
                <span className="ml-2 text-rose-600">({errorRows.length} error{errorRows.length !== 1 ? "s" : ""})</span>
              )}
            </p>
            {errorRows.length > 0 && (
              <div className="mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {errorRows.map((r, i) => <p key={i}>{r._error}</p>)}
              </div>
            )}
            {validRows.length > 0 && (
              <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Name", "Admission No", "Roll", "Class", "Section", "Gender", "DOB", "Blood Group"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{r.firstName} {r.lastName}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.admissionNo}</td>
                        <td className="px-3 py-2 text-slate-600">{r.rollNo || <span className="text-slate-300">auto</span>}</td>
                        <td className="px-3 py-2 text-slate-600">{r.className}</td>
                        <td className="px-3 py-2 text-slate-600">{r.section}</td>
                        <td className="px-3 py-2 capitalize text-slate-600">{r.gender}</td>
                        <td className="px-3 py-2 text-slate-600">{r.dob}</td>
                        <td className="px-3 py-2 text-slate-600">{r.bloodGroup}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {validRows.length > 0 && (
              <button onClick={importAll} disabled={importing} className="btn-primary mt-4 w-full py-3">
                {importing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                  : <>Import {validRows.length} Student{validRows.length !== 1 ? "s" : ""}</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit Student Modal ────────────────────────────────────────
function EditStudentModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    gender: student.gender,
    dob: student.dob,
    bloodGroup: student.bloodGroup,
    classId: student.classId,
    rollNo: String(student.rollNo ?? ""),
    fatherName: student.fatherName,
    motherName: student.motherName,
    primaryContact: student.primaryContact,
    address: student.address || "",
    transportRoute: student.transportRoute || "",
    allergies: student.allergies.join(", "),
    medicalNotes: student.medicalNotes || "",
    status: student.status,
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>(student.photoUrl);

  const editRoll = Number(form.rollNo) || 0;
  const movedClass = form.classId !== student.classId;
  const rollTaken = rollNoClash(data.students, form.classId, editRoll, student.id);

  const save = () => {
    if (!form.firstName || rollTaken || editRoll < 1) return;
    setBusy(true);
    data.updateStudent(student.id, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender as Student["gender"],
      dob: form.dob,
      bloodGroup: form.bloodGroup as BloodGroup,
      classId: form.classId,
      rollNo: editRoll,
      fatherName: form.fatherName.trim(),
      motherName: form.motherName.trim(),
      primaryContact: form.primaryContact.trim(),
      address: form.address.trim() || "—",
      transportRoute: form.transportRoute.trim() || "Self",
      allergies: form.allergies ? form.allergies.split(",").map((a) => a.trim()).filter(Boolean) : [],
      medicalNotes: form.medicalNotes.trim() || undefined,
      status: form.status as Student["status"],
      photoUrl: photo,
    });
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">Edit Student</h3>
        <p className="text-sm text-slate-500">
          Admission no. <span className="font-mono font-semibold text-slate-700">{student.admissionNo}</span>
          {" "}— cannot be changed (used for parent login).
        </p>

        <div className="mt-4">
          <label className="label">Photo (used on the ID card)</label>
          <PhotoUpload subjectId={student.id} name={fullName(student)} value={photo} onChange={setPhoto} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="First name">
            <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="input" />
          </Field>
          <Field label="Last name">
            <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="input" />
          </Field>
          <Field label="Class">
            <select value={form.classId} onChange={(e) => set("classId", e.target.value)} className="input">
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Roll number">
            <input
              type="number" min={1} value={form.rollNo}
              onChange={(e) => set("rollNo", e.target.value)}
              className="input"
            />
            {rollTaken ? (
              <p className="mt-1 text-xs text-rose-600">
                Roll {editRoll} is already {fullName(rollTaken)}&apos;s in this class.
              </p>
            ) : editRoll < 1 ? (
              <p className="mt-1 text-xs text-rose-600">Enter a roll number of 1 or more.</p>
            ) : movedClass ? (
              <p className="mt-1 text-xs text-amber-600">
                Moving class — {nextRollNo(data.students, form.classId, student.id)} is free in {data.classes.find((c) => c.id === form.classId)?.name ?? "the new class"}.
              </p>
            ) : null}
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className="input">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth">
            <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} className="input" />
          </Field>
          <Field label="Blood group">
            <select value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} className="input">
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Primary contact">
            <input value={form.primaryContact} onChange={(e) => set("primaryContact", e.target.value)} className="input" />
          </Field>
          <Field label="Father's name">
            <input value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} className="input" />
          </Field>
          <Field label="Mother's name">
            <input value={form.motherName} onChange={(e) => set("motherName", e.target.value)} className="input" />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <input value={form.address} onChange={(e) => set("address", e.target.value)} className="input" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Transport route">
              <input value={form.transportRoute} onChange={(e) => set("transportRoute", e.target.value)} placeholder="Self / Route 1 — Area" className="input" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Allergies (comma separated)">
              <input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Peanuts, Dairy" className="input" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Medical notes">
              <textarea
                value={form.medicalNotes}
                onChange={(e) => set("medicalNotes", e.target.value)}
                rows={2}
                placeholder="Any medical conditions, medications, or special instructions…"
                className="input resize-none"
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={!form.firstName || !!rollTaken || editRoll < 1 || busy} className="btn-primary flex-1 py-2.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Student Modal ─────────────────────────────────────────
function AddStudentModal({ onClose }: { onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState({
    firstName: "", lastName: "", admissionNo: "", gender: "male" as Student["gender"],
    dob: "", bloodGroup: "Unknown" as BloodGroup, classId: data.classes[0]?.id ?? "",
    rollNo: "", fatherName: "", motherName: "", primaryContact: "", allergies: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<null | {
    admissionNo: string; pin: string; email: string; provision: "demo" | "created" | "failed";
    /** The server's reason, when provisioning failed. */
    reason?: string;
    studentId?: string;
  }>(null);
  const [retrying, setRetrying] = useState(false);

  const dupAdmission = data.students.some((s) => s.admissionNo === form.admissionNo);
  const admissionReady = /^\d{7}$/.test(form.admissionNo) && !dupAdmission;

  // The next free number in the chosen class, re-suggested whenever the class
  // changes — until the office types one, at which point theirs is kept.
  const suggestedRoll = nextRollNo(data.students, form.classId);
  const [rollTouched, setRollTouched] = useState(false);
  const rollNo = rollTouched ? Number(form.rollNo) || 0 : suggestedRoll;
  const rollTaken = rollNoClash(data.students, form.classId, rollNo);

  const save = async () => {
    if (!form.firstName || !/^\d{7}$/.test(form.admissionNo) || dupAdmission || rollTaken || rollNo < 1) return;
    setBusy(true);
    setErr("");
    const pin = DEFAULT_PASSWORD;
    const studentId = `st-${form.admissionNo}`;
    const student: Omit<Student, "id"> & { id: string } = {
      id: studentId, admissionNo: form.admissionNo, firstName: form.firstName, lastName: form.lastName,
      gender: form.gender, dob: form.dob || "2022-01-01", bloodGroup: form.bloodGroup,
      classId: form.classId, rollNo,
      allergies: form.allergies ? form.allergies.split(",").map((a) => a.trim()).filter(Boolean) : [],
      emergencyContacts: [{ name: form.fatherName || "Parent", relation: "Father", phone: form.primaryContact }],
      pickupPersons: [{ name: form.fatherName || "Parent", relation: "Father", phone: form.primaryContact, authorised: true }],
      siblings: [], address: "—", fatherName: form.fatherName, motherName: form.motherName,
      primaryContact: form.primaryContact, parentEmail: undefined, photoUrl: photo,
      admissionDate: new Date().toISOString().slice(0, 10), transportRoute: "Self", status: "active",
    };

    const email = admissionNoToEmail(form.admissionNo);
    let provision: "demo" | "created" | "failed" = "demo";
    let reason: string | undefined;

    // In Firebase mode the server is the authority — check it FIRST so a
    // duplicate is rejected before anything is written locally.
    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/students/create", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ student, pin }),
        });
        if (res.status === 409) {
          setErr(`Admission number ${form.admissionNo} already exists — student was not added.`);
          setBusy(false);
          return;
        }
        provision = res.ok ? "created" : "failed";
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          // Report what actually went wrong: a 403 is an authorisation
          // problem, not the missing env vars this used to blame.
          reason = detail?.detail || detail?.error || `The server replied ${res.status}.`;
        }
      } catch (e) {
        provision = "failed";
        reason = e instanceof Error ? e.message : "The request to the server failed.";
      }
    }

    const { id: _id, ...withoutId } = student;
    data.addStudent(withoutId);

    setBusy(false);
    setCreated({ admissionNo: form.admissionNo, pin, email, provision, reason, studentId });
  };

  const valid = form.firstName && /^\d{7}$/.test(form.admissionNo) && !dupAdmission && !rollTaken && rollNo >= 1;

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          <div className="text-center">
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
              created.provision === "failed" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
              {created.provision === "failed" ? <AlertTriangle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
            </div>
            <h3 className="text-lg font-bold text-slate-900">Student added</h3>
            <p className="mt-1 text-sm text-slate-500">
              {created.provision === "created"
                ? "Parent login has been generated."
                : created.provision === "failed"
                  ? "The parent login still needs to be created."
                  : "Parent login will be generated once Firebase is connected."}
            </p>
          </div>
          <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <CredRow icon={<KeyRound className="h-4 w-4" />} label="Admission no. (login)" value={created.admissionNo} />
            <CredRow icon={<ShieldCheck className="h-4 w-4" />} label="Default password" value={created.pin} />
            <CredRow label="Parent email (internal)" value={created.email} />
          </div>
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            created.provision === "created" ? "bg-emerald-50 text-emerald-700"
            : created.provision === "failed" ? "bg-rose-50 text-rose-700"
            : "bg-amber-50 text-amber-700"}`}>
            {created.provision === "created" && "✓ Firebase Auth account created — the parent can sign in now."}
            {created.provision === "failed" && (
              <>
                <p className="font-semibold">
                  The student was saved, but the parent can&apos;t sign in yet.
                </p>
                {/* The server's own words — the old text blamed env vars for
                    every failure, including authorisation ones. */}
                <p className="mt-1">{created.reason ?? "The server did not say why."}</p>
              </>
            )}
            {created.provision === "demo" && "Connect Firebase to auto-create the parent Auth account on the server."}
          </div>

          {created.provision === "failed" && (
            <button
              onClick={async () => {
                setRetrying(true);
                const res = await callAdminJson("/api/students/manage", {
                  action: "create-login",
                  studentId: created.studentId,
                  admissionNo: created.admissionNo,
                  pin: created.pin,
                });
                setRetrying(false);
                if (res.ok) {
                  setCreated({ ...created, provision: "created", reason: undefined });
                  toast.success(
                    res.data?.existed
                      ? "The parent login already existed — it's now linked."
                      : "Parent login created.",
                  );
                } else {
                  setCreated({
                    ...created,
                    reason: res.data?.detail || res.data?.error || "Still failing — see the server logs.",
                  });
                }
              }}
              disabled={retrying}
              className="btn-primary mt-3 w-full py-2.5"
            >
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Retry creating the parent login
            </button>
          )}

          <p className="mt-3 text-xs text-slate-400">Share the admission number and password with the parent. They can change the password after first sign-in.</p>
          <button onClick={onClose} className="btn-ghost mt-3 w-full py-3">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        <h3 className="text-lg font-bold text-slate-900">Add Student</h3>
        <p className="text-sm text-slate-500">The 7-digit admission number becomes the parent login — a Firebase Auth account is generated automatically.</p>
        {data.classes.length === 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No classes found. Please add classes first from the Classes section.
          </div>
        )}

        <div className="mt-4">
          <label className="label">Photo (optional, for ID card)</label>
          {admissionReady ? (
            <PhotoUpload subjectId={`st-${form.admissionNo}`} name={`${form.firstName} ${form.lastName}`.trim() || "Student"} value={photo} onChange={setPhoto} />
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Enter a valid 7-digit admission number below to attach a photo.</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="First name"><input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="input" /></Field>
          <Field label="Last name"><input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="input" /></Field>
          <Field label="Admission no (7 digits)">
            <input
              value={form.admissionNo}
              onChange={(e) => set("admissionNo", e.target.value.replace(/\D/g, "").slice(0, 7))}
              className={`input ${dupAdmission ? "border-rose-400 focus:ring-rose-300" : ""}`}
            />
            {dupAdmission && <p className="mt-1 text-xs text-rose-600">A student with this admission number already exists.</p>}
          </Field>
          <Field label="Class">
            <select value={form.classId} onChange={(e) => set("classId", e.target.value)} className="input">
              {data.classes.length === 0 && <option value="">— No classes —</option>}
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Roll number">
            <input
              type="number" min={1} value={rollTouched ? form.rollNo : suggestedRoll}
              onChange={(e) => { setRollTouched(true); set("rollNo", e.target.value); }}
              className="input"
            />
            {rollTaken ? (
              <p className="mt-1 text-xs text-rose-600">
                Roll {rollNo} is already {fullName(rollTaken)}&apos;s in this class.
              </p>
            ) : rollNo < 1 ? (
              <p className="mt-1 text-xs text-rose-600">Enter a roll number of 1 or more.</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                {rollTouched ? "Unique within the class." : `Next free number in this class — change it if the office uses another.`}
              </p>
            )}
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className="input capitalize">
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth"><input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} className="input" /></Field>
          <Field label="Blood group">
            <select value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} className="input">
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Primary contact"><input value={form.primaryContact} onChange={(e) => set("primaryContact", e.target.value)} className="input" /></Field>
          <Field label="Father's name"><input value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} className="input" /></Field>
          <Field label="Mother's name"><input value={form.motherName} onChange={(e) => set("motherName", e.target.value)} className="input" /></Field>
          <div className="col-span-2">
            <Field label="Allergies (comma separated)"><input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Peanuts, Dairy" className="input" /></Field>
          </div>
        </div>
        {err && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>}
        <button onClick={save} disabled={!valid || busy || data.classes.length === 0} className="btn-primary mt-5 w-full py-3">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating login…</> : <>Add student & generate login</>}
        </button>
      </div>
    </div>
  );
}

function CredRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); });
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">{icon}{label}</span>
      <button onClick={copy} className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-800 hover:text-brand-600">
        {value} {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
