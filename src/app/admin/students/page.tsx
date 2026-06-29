"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { auth, isFirebaseConfigured, admissionNoToEmail } from "@/lib/firebase";
import { Card, CardHeader, Badge, Avatar, Table, Th, Td, Stat, EmptyState } from "@/components/ui";
import { fullName, ageFromDob, formatDate } from "@/lib/utils";
import { BloodGroup, Student } from "@/lib/types";
import {
  Users, Plus, Search, X, Droplet, AlertTriangle, KeyRound, CheckCircle2,
  Loader2, Copy, ShieldCheck,
} from "lucide-react";

export default function AdminStudents() {
  const data = useData();
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("all");
  const [open, setOpen] = useState(false);

  const rows = data.students
    .filter((s) => classId === "all" || s.classId === classId)
    .filter((s) => !q || fullName(s).toLowerCase().includes(q.toLowerCase()) || s.admissionNo.includes(q))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">Directory of all enrolled children.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Student</button>
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
            <button onClick={() => setClassId("all")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${classId === "all" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>All</button>
            {data.classes.map((c) => (
              <button key={c.id} onClick={() => setClassId(c.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${classId === c.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{c.name}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or admission no…" className="input pl-9 sm:w-64" />
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="p-5"><EmptyState title="No students match" /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Student</Th><Th>Admission</Th><Th>Class</Th><Th>Age</Th><Th>Blood</Th><Th>Allergies</Th><Th>Contact</Th><Th>Status</Th>
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
                    <Td>{cls?.name}</Td>
                    <Td>{ageFromDob(s.dob)}</Td>
                    <Td><Badge tone="slate"><Droplet className="h-3.5 w-3.5" /> {s.bloodGroup}</Badge></Td>
                    <Td>{s.allergies.length ? <Badge tone="red">{s.allergies.join(", ")}</Badge> : <span className="text-slate-300">—</span>}</Td>
                    <Td className="text-slate-500">{s.primaryContact}</Td>
                    <Td><Badge tone={s.status === "active" ? "green" : "slate"}>{s.status}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {open && <AddStudentModal onClose={() => setOpen(false)} />}
    </div>
  );
}

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
    // Auto-generated initial PIN the parent uses with their admission number.
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const id = `st-${form.admissionNo}`;
    const student: Student = {
      id, admissionNo: form.admissionNo, firstName: form.firstName, lastName: form.lastName,
      gender: form.gender, dob: form.dob || "2022-01-01", bloodGroup: form.bloodGroup,
      classId: form.classId, rollNo,
      allergies: form.allergies ? form.allergies.split(",").map((a) => a.trim()).filter(Boolean) : [],
      emergencyContacts: [{ name: form.fatherName || "Parent", relation: "Father", phone: form.primaryContact }],
      pickupPersons: [{ name: form.fatherName || "Parent", relation: "Father", phone: form.primaryContact, authorised: true }],
      siblings: [], address: "—", fatherName: form.fatherName, motherName: form.motherName,
      primaryContact: form.primaryContact, parentEmail: undefined,
      admissionDate: new Date().toISOString().slice(0, 10), transportRoute: "Self", status: "active",
    };

    // Reflect immediately in the local directory.
    const { id: _omit, ...withoutId } = student;
    data.addStudent(withoutId);

    const email = admissionNoToEmail(form.admissionNo);
    let provision: "demo" | "created" | "failed" = "demo";

    // When Firebase is connected, auto-provision the parent's Auth login.
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
            {created.provision === "demo" && "Demo mode — the Firebase Auth account is created automatically once Firebase is connected."}
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
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="First name"><input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="input" /></Field>
          <Field label="Last name"><input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="input" /></Field>
          <Field label="Admission no (7 digits)"><input value={form.admissionNo} onChange={(e) => set("admissionNo", e.target.value.replace(/\D/g, "").slice(0, 7))} className="input" /></Field>
          <Field label="Class">
            <select value={form.classId} onChange={(e) => set("classId", e.target.value)} className="input">
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
        <button onClick={save} disabled={!valid || busy} className="btn-primary mt-5 w-full py-3">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating login…</> : <>Add student & generate login</>}
        </button>
      </div>
    </div>
  );
}

function CredRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
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
