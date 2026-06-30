"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Badge, Avatar, Table, Th, Td, Stat, EmptyState, Loading } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/utils";
import { Staff, StaffRole } from "@/lib/types";
import {
  GraduationCap, Plus, CalendarCheck, X, Mail, Phone, BadgeCheck, Briefcase, Edit2, BookOpen,
  KeyRound, CheckCircle2, Copy, Loader2, ShieldCheck, Trash2,
} from "lucide-react";

// Calls a protected admin route with the caller's ID token. Returns ok/false.
async function callAdmin(path: string, payload: unknown): Promise<boolean> {
  if (!isFirebaseConfigured || !auth?.currentUser) return false;
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Temporary password generated for a new staff login (admin shares it once).
function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const roleTone: Record<StaffRole, "brand" | "amber" | "violet" | "slate"> = {
  teacher: "brand", accountant: "amber", superadmin: "violet", helper: "slate",
};

export default function AdminStaff() {
  const data = useData();
  const [open, setOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const today = todayISO();

  const pendingLeave = data.leaveRequests.filter((l) => l.status === "pending");
  const presentToday = data.staffAttendance.filter((a) => a.date === today && a.status !== "absent").length;

  const [resetCred, setResetCred] = useState<{ name: string; email: string; password: string } | null>(null);

  const removeStaff = async (s: Staff) => {
    if (!confirm(`Delete ${s.name}? This permanently removes their login and record.`)) return;
    data.deleteStaff(s.id);
    if (isFirebaseConfigured) {
      const ok = await callAdmin("/api/staff/manage", { action: "delete", staffId: s.id, email: s.email });
      ok
        ? toast.success(`${s.name} and their login were removed.`)
        : toast.error(`${s.name}'s record was removed, but the login may still exist — check Firebase Admin setup.`);
    } else {
      toast.success(`${s.name} removed.`);
    }
  };

  const resetStaffPassword = async (s: Staff) => {
    if (!isFirebaseConfigured) {
      toast.info("Password reset needs Firebase — not available in demo mode.");
      return;
    }
    if (!confirm(`Reset ${s.name}'s password? A new temporary password will be generated.`)) return;
    const password = genPassword();
    const ok = await callAdmin("/api/staff/manage", { action: "reset", staffId: s.id, email: s.email, password });
    if (ok) setResetCred({ name: s.name, email: s.email, password });
    else toast.error(`Couldn't reset ${s.name}'s password — check their login exists and Firebase Admin setup.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff</h1>
          <p className="mt-1 text-sm text-slate-500">Teachers, accountants and support staff.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Staff</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total Staff" value={data.staff.length} tone="brand" icon={<GraduationCap className="h-5 w-5" />} />
        <Stat label="Teachers" value={data.staff.filter((s) => s.role === "teacher").length} tone="violet" icon={<GraduationCap className="h-5 w-5" />} />
        <Stat label="Present Today" value={`${presentToday}/${data.staff.length}`} tone="green" icon={<CalendarCheck className="h-5 w-5" />} />
        <Stat label="Leave Pending" value={pendingLeave.length} tone="amber" icon={<CalendarCheck className="h-5 w-5" />} />
      </div>

      {pendingLeave.length > 0 && (
        <Card>
          <CardHeader title="Leave Approvals" icon={<CalendarCheck className="h-5 w-5" />} />
          <div className="divide-y divide-slate-100">
            {pendingLeave.map((l) => {
              const member = data.staff.find((s) => s.id === l.staffId);
              return (
                <div key={l.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={member?.name ?? "Staff"} size={38} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{member?.name} <span className="font-normal capitalize text-slate-400">· {l.type} leave</span></p>
                      <p className="text-xs text-slate-400">{formatDate(l.from)} → {formatDate(l.to)} · {l.reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => data.setLeaveStatus(l.id, "approved")} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
                    <button onClick={() => data.setLeaveStatus(l.id, "rejected")} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Staff Directory" icon={<Briefcase className="h-5 w-5" />} />
        {data.loading && data.staff.length === 0 ? (
          <Loading label="Loading staff…" />
        ) : data.staff.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<GraduationCap className="h-8 w-8" />}
              title="No staff yet"
              hint="Add teachers, accountants and support staff — each gets a login."
            />
          </div>
        ) : (
        <Table>
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Name</Th><Th>Role</Th><Th>Subjects</Th><Th>Classes</Th><Th>Experience</Th><Th>Contact</Th><Th>Status</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.staff.map((s) => {
              const classNames = data.classes
                .filter((c) => s.assignedClassIds.includes(c.id) || c.classTeacherId === s.id)
                .map((c) => c.name);
              const subjectNames = data.subjects
                .filter((sub) => s.subjects.includes(sub.id))
                .map((sub) => sub.name);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} src={s.photoUrl} size={34} />
                      <div>
                        <p className="font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.staffCode}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><Badge tone={roleTone[s.role]}>{s.role}</Badge></Td>
                  <Td>
                    {subjectNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {subjectNames.map((n) => (
                          <Badge key={n} tone="violet">{n}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </Td>
                  <Td>{classNames.length ? classNames.join(", ") : <span className="text-slate-300">—</span>}</Td>
                  <Td>{s.experienceYears} yrs</Td>
                  <Td>
                    <div className="flex items-center gap-2 text-slate-500">
                      <a href={`mailto:${s.email}`} className="hover:text-brand-600"><Mail className="h-4 w-4" /></a>
                      <a href={`tel:${s.phone}`} className="hover:text-brand-600"><Phone className="h-4 w-4" /></a>
                    </div>
                  </Td>
                  <Td><Badge tone={s.status === "active" ? "green" : s.status === "on-leave" ? "amber" : "slate"}>{s.status}</Badge></Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditStaff(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        title="Edit staff"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => resetStaffPassword(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeStaff(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete staff"
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

      {open && <AddStaffModal onClose={() => setOpen(false)} />}
      {editStaff && <EditStaffModal staff={editStaff} onClose={() => setEditStaff(null)} />}
      {resetCred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setResetCred(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <button onClick={() => setResetCred(null)} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600"><KeyRound className="h-7 w-7" /></div>
              <h3 className="text-lg font-bold text-slate-900">Password reset</h3>
              <p className="mt-1 text-sm text-slate-500">Share this new temporary password with {resetCred.name} securely.</p>
            </div>
            <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <CredRow icon={<Mail className="h-4 w-4" />} label="Work email (login)" value={resetCred.email} />
              <CredRow icon={<KeyRound className="h-4 w-4" />} label="New temporary password" value={resetCred.password} />
            </div>
            <button onClick={() => setResetCred(null)} className="btn-primary mt-5 w-full py-3">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subjects checklist ────────────────────────────────────────
function SubjectsCheckList({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { subjects } = useData();

  if (subjects.length === 0) {
    return (
      <div className="mt-1 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <BookOpen className="h-4 w-4 shrink-0" />
        No subjects in the system yet. Add subjects from{" "}
        <a href="/admin/subjects" className="font-semibold underline">Admin → Subjects</a> first.
      </div>
    );
  }

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="mt-1 grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
      {subjects.map((sub) => {
        const checked = selected.includes(sub.id);
        return (
          <label
            key={sub.id}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition ${
              checked ? "border-brand-400 bg-brand-50" : "border-transparent hover:bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(sub.id)}
              className="h-3.5 w-3.5 accent-brand-600"
            />
            <span className="flex-1 text-xs font-medium text-slate-700">{sub.name}</span>
            <span className="font-mono text-[10px] text-slate-400">{sub.code}</span>
          </label>
        );
      })}
    </div>
  );
}

// ── Add Staff Modal ───────────────────────────────────────────
function AddStaffModal({ onClose }: { onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", role: "teacher" as StaffRole,
    qualification: "", experienceYears: "0",
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{
    name: string; email: string; password: string;
    provision: "demo" | "created" | "failed";
  } | null>(null);

  const isTeacher = form.role === "teacher" || form.role === "helper";
  const emailClean = form.email.trim().toLowerCase();
  const dupEmail = emailClean.length > 0 && data.staff.some((s) => s.email.toLowerCase() === emailClean);
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailClean);

  const save = async () => {
    if (!form.name || !emailValid || dupEmail) return;
    setBusy(true);
    const password = genPassword();
    const newStaff = data.addStaff({
      staffCode: `EMP-${String(data.staff.length + 1).padStart(3, "0")}`,
      name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role, phone: form.phone,
      qualification: form.qualification || "—", experienceYears: Number(form.experienceYears) || 0,
      joiningDate: new Date().toISOString().slice(0, 10), dob: "1990-01-01", address: "—",
      assignedClassIds: [],
      subjects: isTeacher ? selectedSubjects : [],
      status: "active",
    });

    let provision: "demo" | "created" | "failed" = "demo";
    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/staff/create", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ staff: newStaff, password }),
        });
        provision = res.ok ? "created" : "failed";
      } catch {
        provision = "failed";
      }
    }

    setBusy(false);
    setCreated({ name: newStaff.name, email: newStaff.email, password, provision });
  };

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
            <h3 className="text-lg font-bold text-slate-900">{created.name} added</h3>
            <p className="mt-1 text-sm text-slate-500">
              {created.provision === "created" && "Staff login created. Share these credentials securely."}
              {created.provision === "failed" && "Staff saved, but the login could not be provisioned — check the server's Firebase Admin setup."}
              {created.provision === "demo" && "Demo mode — saved to this browser only. Configure Firebase to create a real login."}
            </p>
          </div>
          {created.provision === "created" && (
            <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <CredRow icon={<Mail className="h-4 w-4" />} label="Work email (login)" value={created.email} />
              <CredRow icon={<KeyRound className="h-4 w-4" />} label="Temporary password" value={created.password} />
              <p className="flex items-start gap-1.5 pt-1 text-xs text-slate-400">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The staff member should change this password after their first sign-in.
              </p>
            </div>
          )}
          <button onClick={onClose} className="btn-primary mt-5 w-full py-3">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">Add Staff</h3>
        <p className="text-sm text-slate-500">Staff sign in with their work email.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Full name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className="input" autoFocus />
          </div>
          <div>
            <label className="label">Work email</label>
            <input
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={`input ${dupEmail ? "border-rose-400 focus:ring-rose-300" : ""}`}
              placeholder="name@school.app"
            />
            {dupEmail && <p className="mt-1 text-xs text-rose-600">A staff member with this email already exists.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                value={form.role}
                onChange={(e) => { set("role", e.target.value); setSelectedSubjects([]); }}
                className="input capitalize"
              >
                {(["teacher", "accountant", "helper", "superadmin"] as StaffRole[]).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Qualification</label>
              <input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Experience (yrs)</label>
              <input type="number" min={0} value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} className="input" />
            </div>
          </div>

          {isTeacher && (
            <div>
              <label className="label flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Subjects taught
                {selectedSubjects.length > 0 && (
                  <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    {selectedSubjects.length} selected
                  </span>
                )}
              </label>
              <SubjectsCheckList selected={selectedSubjects} onChange={setSelectedSubjects} />
            </div>
          )}
        </div>
        <button onClick={save} disabled={!form.name || !emailValid || dupEmail || busy} className="btn-primary mt-5 w-full py-3">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : <><BadgeCheck className="h-4 w-4" /> Add staff</>}
        </button>
      </div>
    </div>
  );
}

// Read-only credential row with copy-to-clipboard.
function CredRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-slate-800">{value}</span>
        <button onClick={copy} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600" title="Copy">
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Edit Staff Modal ──────────────────────────────────────────
function EditStaffModal({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState({
    name: staff.name,
    phone: staff.phone,
    qualification: staff.qualification,
    experienceYears: String(staff.experienceYears),
    status: staff.status,
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(staff.subjects);
  const [busy, setBusy] = useState(false);

  const isTeacher = staff.role === "teacher" || staff.role === "helper";

  const save = async () => {
    if (!form.name) return;
    setBusy(true);
    const status = form.status as Staff["status"];
    data.updateStaff(staff.id, {
      name: form.name.trim(),
      phone: form.phone.trim(),
      qualification: form.qualification.trim() || "—",
      experienceYears: Number(form.experienceYears) || 0,
      status,
      subjects: isTeacher ? selectedSubjects : [],
    });

    // Keep the login in step with the record: an inactive staff member can't sign in.
    if (isFirebaseConfigured) {
      const ok = await callAdmin("/api/staff/manage", {
        action: "update", staffId: staff.id, email: staff.email,
        role: staff.role, name: form.name.trim(), disabled: status === "inactive",
      });
      if (ok && status === "inactive") toast.info(`${form.name}'s login is now disabled.`);
      else if (ok) toast.success(`${form.name} updated.`);
      else toast.error(`${form.name}'s profile was saved, but the login couldn't be synced.`);
    } else {
      toast.success(`${form.name} updated.`);
    }
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">Edit Staff</h3>
        <p className="text-sm text-slate-500">
          {staff.email} · <span className="capitalize">{staff.role}</span>
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Full name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className="input" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
                <option value="active">Active</option>
                <option value="on-leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Qualification</label>
              <input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Experience (yrs)</label>
              <input type="number" min={0} value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} className="input" />
            </div>
          </div>

          {isTeacher && (
            <div>
              <label className="label flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Subjects taught
                {selectedSubjects.length > 0 && (
                  <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    {selectedSubjects.length} selected
                  </span>
                )}
              </label>
              <SubjectsCheckList selected={selectedSubjects} onChange={setSelectedSubjects} />
            </div>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={!form.name || busy} className="btn-primary flex-1 py-2.5">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
