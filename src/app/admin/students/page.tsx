"use client";

import { useRef, useState } from "react";
import { useData } from "@/lib/store";
import { auth, isFirebaseConfigured, admissionNoToEmail } from "@/lib/firebase";
import { Card, Badge, Avatar, Table, Th, Td, Stat, EmptyState } from "@/components/ui";
import { fullName, ageFromDob } from "@/lib/utils";
import { BloodGroup, Student } from "@/lib/types";
import {
  Users, Plus, Search, X, Droplet, AlertTriangle, KeyRound, CheckCircle2,
  Loader2, Copy, ShieldCheck, Upload, Download, FileText, Edit2,
} from "lucide-react";

// ── CSV template ──────────────────────────────────────────────
const CSV_HEADERS = [
  "firstName", "lastName", "admissionNo", "gender",
  "dob", "bloodGroup", "classId",
  "fatherName", "motherName", "primaryContact", "allergies",
];
const CSV_EXAMPLE = [
  "Aarav", "Mehta", "2025001", "male",
  "2022-04-18", "B+", "cls-abc123",
  "Rohit Mehta", "Sneha Mehta", "+91 98765 40001", "Peanuts",
];

function downloadTemplate() {
  const csv = [CSV_HEADERS, CSV_EXAMPLE].map((r) => r.join(",")).join("\n");
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
  classId: string; fatherName: string; motherName: string;
  primaryContact: string; allergies: string[];
  _error?: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line, i) => {
    const vals = line.split(",").map((v) => v.trim());
    const get = (key: string) => vals[headers.indexOf(key)] ?? "";
    const admNo = get("admissionno");
    if (!/^\d{7}$/.test(admNo)) {
      return {
        firstName: "", lastName: "", admissionNo: admNo, gender: "male" as const,
        dob: "", bloodGroup: "Unknown" as BloodGroup, classId: "", fatherName: "",
        motherName: "", primaryContact: "", allergies: [],
        _error: `Row ${i + 2}: Invalid 7-digit admission number "${admNo}"`,
      };
    }
    return {
      firstName: get("firstname"), lastName: get("lastname"),
      admissionNo: admNo,
      gender: (get("gender") as Student["gender"]) || "male",
      dob: get("dob") || "2022-01-01",
      bloodGroup: (get("bloodgroup") as BloodGroup) || "Unknown",
      classId: get("classid"),
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
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const rows = data.students
    .filter((s) => classId === "all" || s.classId === classId)
    .filter(
      (s) =>
        !q ||
        fullName(s).toLowerCase().includes(q.toLowerCase()) ||
        s.admissionNo.includes(q),
    )
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">Directory of all enrolled children.</p>
        </div>
        <div className="flex gap-2">
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

        {rows.length === 0 ? (
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
                <Th>Student</Th><Th>Admission</Th><Th>Class</Th><Th>Age</Th>
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
                    <Td>{cls?.name ?? <span className="text-slate-300">—</span>}</Td>
                    <Td>{ageFromDob(s.dob)}</Td>
                    <Td><Badge tone="slate"><Droplet className="h-3.5 w-3.5" /> {s.bloodGroup}</Badge></Td>
                    <Td>{s.allergies.length ? <Badge tone="red">{s.allergies.join(", ")}</Badge> : <span className="text-slate-300">—</span>}</Td>
                    <Td className="text-slate-500">{s.primaryContact}</Td>
                    <Td><Badge tone={s.status === "active" ? "green" : "slate"}>{s.status}</Badge></Td>
                    <Td>
                      <button
                        onClick={() => setEditStudent(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        title="Edit student"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
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
      {editStudent && <EditStudentModal student={editStudent} onClose={() => setEditStudent(null)} />}
    </div>
  );
}

// ── Bulk Upload Modal ─────────────────────────────────────────
function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [provisioned, setProvisioned] = useState(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRows(parseCSV(ev.target?.result as string));
    reader.readAsText(file);
  };

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  const importAll = async () => {
    setImporting(true);

    // Roll numbers continue from the highest existing one per class so a batch
    // doesn't hand out duplicates (state doesn't update mid-loop).
    const rollTally: Record<string, number> = {};
    data.students.forEach((s) => {
      rollTally[s.classId] = Math.max(rollTally[s.classId] ?? 0, s.rollNo);
    });

    // When Firebase is live, provision each parent login + Firestore docs via
    // the same protected route the single "Add Student" flow uses.
    let token: string | null = null;
    if (isFirebaseConfigured && auth?.currentUser) {
      try { token = await auth.currentUser.getIdToken(); } catch { token = null; }
    }

    let created = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const row of validRows) {
      rollTally[row.classId] = (rollTally[row.classId] ?? 0) + 1;
      const student: Student = {
        id: `st-${row.admissionNo}`,
        admissionNo: row.admissionNo, firstName: row.firstName, lastName: row.lastName,
        gender: row.gender, dob: row.dob, bloodGroup: row.bloodGroup,
        classId: row.classId, rollNo: rollTally[row.classId],
        allergies: row.allergies,
        emergencyContacts: [{ name: row.fatherName || "Parent", relation: "Father", phone: row.primaryContact }],
        pickupPersons: [{ name: row.fatherName || "Parent", relation: "Father", phone: row.primaryContact, authorised: true }],
        siblings: [], address: "—", fatherName: row.fatherName, motherName: row.motherName,
        primaryContact: row.primaryContact,
        admissionDate: today, transportRoute: "Self", status: "active",
      };

      const { id: _id, ...withoutId } = student;
      data.addStudent(withoutId);

      if (token) {
        try {
          const res = await fetch("/api/students/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            // Default PIN = admission number; parents can change it later.
            body: JSON.stringify({ student, pin: row.admissionNo }),
          });
          if (res.ok) created++;
        } catch {
          /* leave provisioning count unchanged; student still saved locally */
        }
      }
    }

    setProvisioned(created);
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
            {validRows.length} student{validRows.length !== 1 ? "s" : ""} added successfully.
          </p>
          {isFirebaseConfigured ? (
            <p className="mt-2 text-xs text-slate-500">
              {provisioned} parent login{provisioned !== 1 ? "s" : ""} provisioned
              {" "}(login = admission number, PIN = admission number).
              {provisioned < validRows.length && (
                <span className="mt-1 block text-amber-600">
                  {validRows.length - provisioned} could not be provisioned — check the server&apos;s Firebase Admin setup.
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
            <button onClick={downloadTemplate} className="btn-ghost shrink-0">
              <Download className="h-4 w-4" /> Template CSV
            </button>
          </div>
          {data.classes.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Class IDs for the <code>classId</code> column:</p>
              <div className="flex flex-wrap gap-2">
                {data.classes.map((c) => (
                  <span key={c.id} className="rounded bg-brand-50 px-2 py-0.5 font-mono text-xs text-brand-700">
                    {c.id} = {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
            <strong>Tips:</strong> Use <code>;</code> to separate multiple allergies (e.g. <code>Peanuts;Dairy</code>).
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
                      {["Name", "Admission No", "Class ID", "Gender", "DOB", "Blood Group"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{r.firstName} {r.lastName}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.admissionNo}</td>
                        <td className="px-3 py-2 text-slate-600">{r.classId}</td>
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

  const save = () => {
    if (!form.firstName) return;
    setBusy(true);
    data.updateStudent(student.id, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender as Student["gender"],
      dob: form.dob,
      bloodGroup: form.bloodGroup as BloodGroup,
      classId: form.classId,
      fatherName: form.fatherName.trim(),
      motherName: form.motherName.trim(),
      primaryContact: form.primaryContact.trim(),
      address: form.address.trim() || "—",
      transportRoute: form.transportRoute.trim() || "Self",
      allergies: form.allergies ? form.allergies.split(",").map((a) => a.trim()).filter(Boolean) : [],
      medicalNotes: form.medicalNotes.trim() || undefined,
      status: form.status as Student["status"],
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
          <button onClick={save} disabled={!form.firstName || busy} className="btn-primary flex-1 py-2.5">
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
    fatherName: "", motherName: "", primaryContact: "", allergies: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<null | {
    admissionNo: string; pin: string; email: string; provision: "demo" | "created" | "failed";
  }>(null);

  const save = async () => {
    if (!form.firstName || !/^\d{7}$/.test(form.admissionNo)) return;
    setBusy(true);
    const rollNo = data.students.filter((s) => s.classId === form.classId).length + 1;
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const studentId = `st-${form.admissionNo}`;
    const student: Omit<Student, "id"> & { id: string } = {
      id: studentId, admissionNo: form.admissionNo, firstName: form.firstName, lastName: form.lastName,
      gender: form.gender, dob: form.dob || "2022-01-01", bloodGroup: form.bloodGroup,
      classId: form.classId, rollNo,
      allergies: form.allergies ? form.allergies.split(",").map((a) => a.trim()).filter(Boolean) : [],
      emergencyContacts: [{ name: form.fatherName || "Parent", relation: "Father", phone: form.primaryContact }],
      pickupPersons: [{ name: form.fatherName || "Parent", relation: "Father", phone: form.primaryContact, authorised: true }],
      siblings: [], address: "—", fatherName: form.fatherName, motherName: form.motherName,
      primaryContact: form.primaryContact, parentEmail: undefined,
      admissionDate: new Date().toISOString().slice(0, 10), transportRoute: "Self", status: "active",
    };

    const { id: _id, ...withoutId } = student;
    data.addStudent(withoutId);

    const email = admissionNoToEmail(form.admissionNo);
    let provision: "demo" | "created" | "failed" = "demo";

    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/students/create", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ student, pin }),
        });
        provision = res.ok ? "created" : "failed";
      } catch {
        provision = "failed";
      }
    }

    setBusy(false);
    setCreated({ admissionNo: form.admissionNo, pin, email, provision });
  };

  const valid = form.firstName && /^\d{7}$/.test(form.admissionNo);

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
            <h3 className="text-lg font-bold text-slate-900">Student added</h3>
            <p className="mt-1 text-sm text-slate-500">Parent login has been generated.</p>
          </div>
          <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <CredRow icon={<KeyRound className="h-4 w-4" />} label="Admission no. (login)" value={created.admissionNo} />
            <CredRow icon={<ShieldCheck className="h-4 w-4" />} label="Temporary PIN" value={created.pin} />
            <CredRow label="Parent email (internal)" value={created.email} />
          </div>
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            created.provision === "created" ? "bg-emerald-50 text-emerald-700"
            : created.provision === "failed" ? "bg-rose-50 text-rose-700"
            : "bg-amber-50 text-amber-700"}`}>
            {created.provision === "created" && "✓ Firebase Auth account created — the parent can sign in now."}
            {created.provision === "failed" && "Saved locally, but the Firebase account could not be created. Check Admin SDK env vars."}
            {created.provision === "demo" && "Connect Firebase to auto-create the parent Auth account on the server."}
          </div>
          <p className="mt-3 text-xs text-slate-400">Share the admission number and PIN with the parent. They can change the PIN after first sign-in.</p>
          <button onClick={onClose} className="btn-primary mt-4 w-full py-3">Done</button>
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
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="First name"><input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="input" /></Field>
          <Field label="Last name"><input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="input" /></Field>
          <Field label="Admission no (7 digits)"><input value={form.admissionNo} onChange={(e) => set("admissionNo", e.target.value.replace(/\D/g, "").slice(0, 7))} className="input" /></Field>
          <Field label="Class">
            <select value={form.classId} onChange={(e) => set("classId", e.target.value)} className="input">
              {data.classes.length === 0 && <option value="">— No classes —</option>}
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
