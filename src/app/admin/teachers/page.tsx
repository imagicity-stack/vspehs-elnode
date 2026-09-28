"use client";

// ─────────────────────────────────────────────────────────────
// Admin → Teachers
// ─────────────────────────────────────────────────────────────
// Teaching-side management of staff: who teaches which subject in which class,
// and the lifecycle of their login. Profile basics (name, photo, ID card
// details) stay on Admin → Staff; this page owns assignments and accounts.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useData, type AuditActor } from "@/lib/store";
import { auth, isFirebaseConfigured, DEFAULT_PASSWORD } from "@/lib/firebase";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Badge, Avatar, Table, Th, Td, Stat, EmptyState, Loading } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Staff } from "@/lib/types";
import { teacherScope } from "@/lib/exams";
import {
  GraduationCap, Search, X, Mail, Phone, KeyRound, CheckCircle2, Loader2, ShieldCheck,
  ShieldOff, UserCheck, Users, BookOpen, Link2, AlertTriangle, Fingerprint, Clock,
} from "lucide-react";

/** Calls a protected admin route with the caller's ID token. */
async function callAdmin(path: string, payload: unknown): Promise<{ ok: boolean; data?: any }> {
  if (!isFirebaseConfigured || !auth?.currentUser) return { ok: false };
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false };
  }
}

/** The server's explanation for a failed admin call, or a fallback. */
const why = (res: { ok: boolean; data?: any }, fallback: string) =>
  res.data?.detail || res.data?.error || fallback;

/** Teaching roles only — accountants never hold class-subject assignments. */
const TEACHING_ROLES = new Set(["teacher", "helper"]);

export default function AdminTeachers() {
  const { user } = useAuth();
  const data = useData();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Staff | null>(null);

  const actor: AuditActor = {
    id: user?.staffId ?? user?.uid ?? "admin",
    name: user?.displayName ?? "Super Admin",
    role: user?.role ?? "superadmin",
  };

  const teachers = useMemo(
    () => data.staff
      .filter((s) => TEACHING_ROLES.has(s.role))
      .filter((s) => !q
        || s.name.toLowerCase().includes(q.toLowerCase())
        || s.staffCode.toLowerCase().includes(q.toLowerCase())
        || s.email.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [data.staff, q],
  );

  const withLogin = data.staff.filter((s) => TEACHING_ROLES.has(s.role) && s.authUid).length;
  const pendingPassword = data.staff.filter((s) => TEACHING_ROLES.has(s.role) && s.mustChangePassword).length;
  const unassigned = data.staff.filter(
    (s) => TEACHING_ROLES.has(s.role) && s.status === "active"
      && !data.teacherAssignments.some((a) => a.teacherId === s.id),
  ).length;

  const classNameOf = (id: string) => data.classes.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teachers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Class &amp; subject allocation and login accounts. Add or edit profiles from{" "}
            <Link href="/admin/staff" className="font-semibold text-brand-600 hover:underline">Staff</Link>.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teachers…" className="input pl-9 sm:w-64" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Teaching staff" value={data.staff.filter((s) => TEACHING_ROLES.has(s.role)).length} tone="brand" icon={<GraduationCap className="h-5 w-5" />} />
        <Stat label="With a login" value={withLogin} tone="green" icon={<ShieldCheck className="h-5 w-5" />} hint="Firebase account provisioned" />
        <Stat label="Default password" value={pendingPassword} tone="amber" icon={<KeyRound className="h-5 w-5" />} hint="Not yet changed by the teacher" />
        <Stat label="No assignments" value={unassigned} tone={unassigned > 0 ? "red" : "slate"} icon={<AlertTriangle className="h-5 w-5" />} hint="Active but not allocated" />
      </div>

      {!isFirebaseConfigured && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Demo mode — assignments save to this browser only and login accounts can&apos;t be
            provisioned. Configure Firebase to manage real accounts.
          </span>
        </div>
      )}

      <Card>
        <CardHeader title="Teaching staff" subtitle={`${teachers.length} shown`} icon={<Users className="h-5 w-5" />} />
        {data.loading && data.staff.length === 0 ? (
          <Loading label="Loading teachers…" />
        ) : teachers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<GraduationCap className="h-8 w-8" />}
              title={data.staff.length === 0 ? "No staff yet" : "No teachers match"}
              hint="Teachers and helpers added from Admin → Staff appear here."
            />
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Teacher</Th><Th>Designation</Th><Th>Assignments</Th><Th>Class teacher</Th>
                <Th>Login</Th><Th>Last login</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {teachers.map((t) => {
                const scope = teacherScope(t.id, data.teacherAssignments);
                const classTeacherOf = data.classes.filter((c) => c.classTeacherId === t.id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={t.name} src={t.photoUrl} size={34} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">{t.name}</p>
                          <p className="truncate text-xs text-slate-400">{t.staffCode} · {t.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-sm text-slate-700">{t.designation || t.role}</p>
                      {t.department && <p className="text-xs text-slate-400">{t.department}</p>}
                    </Td>
                    <Td>
                      {scope.pairs.length === 0 ? (
                        <Badge tone="red">None</Badge>
                      ) : (
                        <span className="text-sm text-slate-700">
                          {scope.pairs.length} pair{scope.pairs.length === 1 ? "" : "s"}
                          <span className="text-slate-400"> · {scope.classIds.length} class{scope.classIds.length === 1 ? "" : "es"}</span>
                        </span>
                      )}
                    </Td>
                    <Td>
                      {classTeacherOf.length
                        ? <Badge tone="violet">{classTeacherOf.map((c) => c.name).join(", ")}</Badge>
                        : <span className="text-slate-300">—</span>}
                    </Td>
                    <Td>
                      {t.authUid
                        ? <Badge tone={t.loginDisabled ? "red" : "green"}>{t.loginDisabled ? "Disabled" : "Active"}</Badge>
                        : <Badge tone="slate">Not created</Badge>}
                      {t.mustChangePassword && t.authUid && !t.loginDisabled && (
                        <span className="ml-1.5 text-[11px] font-medium text-amber-600">default password</span>
                      )}
                    </Td>
                    <Td>
                      {t.lastLoginAt
                        ? <span className="text-sm text-slate-600">{formatDateTime(t.lastLoginAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                        : <span className="text-slate-300">Never</span>}
                    </Td>
                    <Td><Badge tone={t.status === "active" ? "green" : t.status === "on-leave" ? "amber" : "slate"}>{t.status}</Badge></Td>
                    <Td>
                      <button onClick={() => setOpen(t)} className="btn-ghost px-2.5 py-1.5 text-xs">Manage</button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {open && (
        <TeacherDrawer
          teacher={data.staff.find((s) => s.id === open.id) ?? open}
          actor={actor}
          classNameOf={classNameOf}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Manage drawer — profile, assignments, account
// ─────────────────────────────────────────────────────────────
function TeacherDrawer({
  teacher, actor, classNameOf, onClose,
}: {
  teacher: Staff;
  actor: AuditActor;
  classNameOf: (id: string) => string;
  onClose: () => void;
}) {
  const data = useData();
  const [tab, setTab] = useState<"profile" | "assignments" | "account">("assignments");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={teacher.name} src={teacher.photoUrl} size={44} />
            <div>
              <h3 className="font-bold text-slate-900">{teacher.name}</h3>
              <p className="text-sm text-slate-500">{teacher.staffCode} · {teacher.designation || teacher.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-6 py-2">
          {([
            ["assignments", "Assignments", BookOpen],
            ["account", "Account", ShieldCheck],
            ["profile", "Profile", UserCheck],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === key ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "assignments" && <AssignmentsTab teacher={teacher} actor={actor} onDone={onClose} />}
          {tab === "account" && <AccountTab teacher={teacher} actor={actor} />}
          {tab === "profile" && <ProfileTab teacher={teacher} classNameOf={classNameOf} />}
        </div>
      </div>
    </div>
  );
}

// ── Assignments: the (class × subject) matrix ─────────────────
function AssignmentsTab({
  teacher, actor, onDone,
}: { teacher: Staff; actor: AuditActor; onDone: () => void }) {
  const data = useData();
  const existing = useMemo(
    () => new Set(
      data.teacherAssignments
        .filter((a) => a.teacherId === teacher.id)
        .map((a) => `${a.classId}|${a.subjectId}`),
    ),
    [data.teacherAssignments, teacher.id],
  );
  const [picked, setPicked] = useState<Set<string>>(() => new Set(existing));
  const [busy, setBusy] = useState(false);

  const toggle = (classId: string, subjectId: string) =>
    setPicked((cur) => {
      const key = `${classId}|${subjectId}`;
      const next = new Set(cur);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const dirty =
    picked.size !== existing.size || Array.from(picked).some((k) => !existing.has(k));

  const save = () => {
    setBusy(true);
    const pairs = Array.from(picked).map((k) => {
      const [classId, subjectId] = k.split("|");
      return { classId, subjectId };
    });
    data.setTeacherAssignments(teacher.id, pairs, actor);
    // Keep the coarse staff fields in step so attendance and daily updates,
    // which still scope by them, match what was just allocated here.
    data.updateStaff(teacher.id, {
      assignedClassIds: Array.from(new Set(pairs.map((p) => p.classId))),
      subjects: Array.from(new Set(pairs.map((p) => p.subjectId))),
    });
    toast.success(`${teacher.name}: ${pairs.length} assignment${pairs.length === 1 ? "" : "s"} saved.`);
    setBusy(false);
    onDone();
  };

  if (data.classes.length === 0 || data.subjects.length === 0) {
    return (
      <EmptyState
        icon={<Link2 className="h-8 w-8" />}
        title="Classes and subjects are needed first"
        hint="Add them from Admin → Classes and Admin → Subjects, then allocate them here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Tick each subject {teacher.name.split(" ")[0]} teaches in each class. This is what grants
        access to marks entry — a teacher can only mark the papers ticked here.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Class
              </th>
              {data.subjects.map((s) => (
                <th key={s.id} className="bg-slate-50 px-2 py-2.5 text-center text-[11px] font-semibold text-slate-500" title={s.name}>
                  {s.code || s.name.slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.classes.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 whitespace-nowrap border-t border-slate-100 bg-white px-3 py-2 font-medium text-slate-700">
                  {c.name}
                </td>
                {data.subjects.map((s) => {
                  const key = `${c.id}|${s.id}`;
                  const on = picked.has(key);
                  return (
                    <td key={s.id} className="border-t border-slate-100 px-2 py-2 text-center">
                      <button
                        onClick={() => toggle(c.id, s.id)}
                        aria-label={`${c.name} ${s.name}`}
                        className={`h-6 w-6 rounded-md border text-[11px] font-bold transition ${
                          on
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-slate-200 text-transparent hover:border-brand-300 hover:bg-brand-50"
                        }`}
                      >
                        ✓
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {picked.size} assignment{picked.size === 1 ? "" : "s"} selected
        </p>
        <button onClick={save} disabled={!dirty || busy} className="btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save assignments
        </button>
      </div>
    </div>
  );
}

// ── Account: the login lifecycle ──────────────────────────────
function AccountTab({ teacher, actor }: { teacher: Staff; actor: AuditActor }) {
  const data = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const [cred, setCred] = useState<{ email: string; password: string } | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [emailDraft, setEmailDraft] = useState(teacher.email);

  // Follow the record when it changes underneath us (another admin's edit, or
  // our own save landing), but never while an edit is in progress.
  useEffect(() => {
    setEmailDraft(teacher.email);
  }, [teacher.email]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    await fn();
    setBusy(null);
  };

  const emailClean = emailDraft.trim().toLowerCase();
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailClean);
  const emailChanged = emailClean !== teacher.email.trim().toLowerCase();
  const emailTaken = emailChanged
    && data.staff.some((s) => s.id !== teacher.id && s.email.trim().toLowerCase() === emailClean);

  const saveEmail = () =>
    run("email", async () => {
      if (!emailValid || emailTaken || !emailChanged) return;
      const previous = teacher.email;

      if (!isFirebaseConfigured) {
        // Demo mode has no Auth account to keep in step.
        data.updateStaff(teacher.id, { email: emailClean });
        toast.success(`Login email changed to ${emailClean}.`);
        return;
      }

      const res = await callAdmin("/api/staff/manage", {
        action: "update-email", staffId: teacher.id, email: previous, newEmail: emailClean,
      });
      if (!res.ok) {
        // Put the field back so the form never shows an address that isn't live.
        setEmailDraft(previous);
        toast.error(why(res, "Couldn't change the login email."));
        return;
      }

      data.updateStaff(teacher.id, { email: emailClean });
      data.logAudit({
        action: "teacher.login-created",
        entity: teacher.name,
        entityId: teacher.id,
        actorId: actor.id, actorName: actor.name, actorRole: actor.role,
        summary: res.data?.provisioned
          ? "Login email changed — they now sign in with the new address"
          : "Email updated (no login provisioned yet)",
        before: previous,
        after: emailClean,
      });
      toast.success(
        res.data?.provisioned
          ? `${teacher.name} now signs in as ${emailClean}.`
          : `Email saved. Create their login to activate it.`,
      );
    });

  const createLogin = () =>
    run("create", async () => {
      if (!isFirebaseConfigured) {
        toast.info("Firebase is required to create a login.");
        return;
      }
      const res = await callAdmin("/api/staff/create", { staff: teacher, password: DEFAULT_PASSWORD });
      if (res.ok) {
        setCred({ email: teacher.email, password: DEFAULT_PASSWORD });
        data.logAudit({
          action: "teacher.login-created",
          entity: teacher.name,
          entityId: teacher.id,
          actorId: actor.id, actorName: actor.name, actorRole: actor.role,
          summary: `Login created for ${teacher.email}`,
        });
      } else {
        toast.error(why(res, "Couldn't create the login — check the server's Firebase Admin setup."));
      }
    });

  const resetPassword = () =>
    run("reset", async () => {
      if (!confirm(`Reset ${teacher.name}'s password back to "${DEFAULT_PASSWORD}"?`)) return;
      const res = await callAdmin("/api/staff/manage", {
        action: "reset", staffId: teacher.id, email: teacher.email, password: DEFAULT_PASSWORD,
      });
      if (res.ok) {
        setCred({ email: teacher.email, password: DEFAULT_PASSWORD });
        data.logAudit({
          action: "teacher.password-reset",
          entity: teacher.name,
          entityId: teacher.id,
          actorId: actor.id, actorName: actor.name, actorRole: actor.role,
          summary: "Password reset to the default; change forced at next sign-in",
        });
      } else {
        toast.error(why(res, "Couldn't reset the password."));
      }
    });

  const setDisabled = (disabled: boolean) =>
    run(disabled ? "disable" : "enable", async () => {
      const res = await callAdmin("/api/staff/manage", {
        action: "update", staffId: teacher.id, email: teacher.email, role: teacher.role,
        name: teacher.name, disabled,
      });
      if (res.ok) {
        toast.success(`${teacher.name}'s login is now ${disabled ? "disabled" : "active"}.`);
        data.logAudit({
          action: disabled ? "teacher.login-disabled" : "teacher.login-enabled",
          entity: teacher.name,
          entityId: teacher.id,
          actorId: actor.id, actorName: actor.name, actorRole: actor.role,
          summary: disabled ? "Access removed" : "Access restored",
        });
      } else {
        toast.error(why(res, "Couldn't update the login."));
      }
    });

  const checkStatus = () =>
    run("status", async () => {
      const res = await callAdmin("/api/staff/manage", {
        action: "status", staffId: teacher.id, email: teacher.email,
      });
      if (res.ok) setStatus(res.data);
      else toast.error(why(res, "Couldn't read the account status."));
    });

  return (
    <div className="space-y-5">
      {/* The email is the login ID, so it's edited here rather than shown flat. */}
      <div className="rounded-xl border border-slate-200 p-3">
        <label className="label flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" /> Work email — this is their login ID
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="name@school.app"
            className={`input ${(emailDraft.trim() && !emailValid) || emailTaken ? "border-rose-400 focus:ring-rose-200" : ""}`}
          />
          <button
            onClick={saveEmail}
            disabled={!emailChanged || !emailValid || emailTaken || busy !== null}
            className="btn-primary shrink-0"
          >
            {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Update email
          </button>
        </div>
        {emailTaken ? (
          <p className="mt-1.5 text-xs text-rose-600">Another staff member already uses that email.</p>
        ) : emailDraft.trim() && !emailValid ? (
          <p className="mt-1.5 text-xs text-rose-600">Enter a valid email address.</p>
        ) : teacher.authUid ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Changing this moves their Firebase login too — they sign in with the new address
            straight away, and their password is unaffected.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400">
            No login exists yet. Save the email, then create the login below.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field icon={<Phone className="h-4 w-4" />} label="Mobile" value={teacher.phone || "—"} />
        <Field icon={<Fingerprint className="h-4 w-4" />} label="Firebase UID" value={teacher.authUid || "Not provisioned"} mono />
        <Field
          icon={<Clock className="h-4 w-4" />}
          label="Last login"
          value={formatDateTime(teacher.lastLoginAt) === "—" ? "Never" : formatDateTime(teacher.lastLoginAt)}
        />
        <Field
          icon={<KeyRound className="h-4 w-4" />}
          label="Password status"
          value={
            !teacher.authUid ? "No login yet"
              : teacher.mustChangePassword ? "Still on the issued default"
              : teacher.passwordChangedAt ? `Changed ${formatDate(teacher.passwordChangedAt)}`
              : "Changed"
          }
        />
        <Field
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Account"
          value={!teacher.authUid ? "Not created" : teacher.loginDisabled ? "Disabled" : "Active"}
        />
      </div>

      {cred && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Share these credentials securely
          </p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-emerald-900">Email: <span className="font-mono font-semibold">{cred.email}</span></p>
            <p className="text-emerald-900">Password: <span className="font-mono font-semibold">{cred.password}</span></p>
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            They will be asked to set their own password the first time they sign in.
          </p>
        </div>
      )}

      {status && (
        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Firebase account</p>
          {status.provisioned ? (
            <ul className="mt-1 space-y-0.5 text-xs">
              <li>UID: <span className="font-mono">{status.uid}</span></li>
              <li>Disabled: {String(status.disabled)}</li>
              <li>Created: {status.createdAt ?? "—"}</li>
              <li>Last sign-in: {status.lastSignInAt ?? "never"}</li>
            </ul>
          ) : (
            <p className="mt-1 text-xs">No Firebase account exists for {teacher.email}.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!teacher.authUid ? (
          <button onClick={createLogin} disabled={busy !== null || !teacher.email} className="btn-primary">
            {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Create login
          </button>
        ) : (
          <>
            <button onClick={resetPassword} disabled={busy !== null} className="btn-ghost">
              {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Reset password
            </button>
            {teacher.loginDisabled ? (
              <button onClick={() => setDisabled(false)} disabled={busy !== null} className="btn-primary">
                {busy === "enable" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Enable login
              </button>
            ) : (
              <button onClick={() => setDisabled(true)} disabled={busy !== null} className="btn-ghost text-rose-600">
                {busy === "disable" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Disable login
              </button>
            )}
            <button onClick={createLogin} disabled={busy !== null} className="btn-ghost">
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Regenerate access
            </button>
          </>
        )}
        <button onClick={checkStatus} disabled={busy !== null} className="btn-ghost">
          {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Check status
        </button>
      </div>

      {teacher.status === "inactive" && teacher.authUid && !teacher.loginDisabled && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This teacher is marked inactive but their login is still active. Disable it to remove access —
          their past examination records stay intact either way.
        </div>
      )}
    </div>
  );
}

// ── Profile summary ───────────────────────────────────────────
function ProfileTab({ teacher, classNameOf }: { teacher: Staff; classNameOf: (id: string) => string }) {
  const data = useData();
  const scope = teacherScope(teacher.id, data.teacherAssignments);
  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? id;
  const classTeacherOf = data.classes.filter((c) => c.classTeacherId === teacher.id);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Employee ID" value={teacher.staffCode} />
        <Field label="Designation" value={teacher.designation || teacher.role} />
        <Field label="Department" value={teacher.department || "—"} />
        <Field label="Qualification" value={teacher.qualification} />
        <Field label="Mobile" value={teacher.phone || "—"} />
        <Field label="Email" value={teacher.email} />
        <Field label="Joined" value={teacher.joiningDate ? formatDate(teacher.joiningDate) : "—"} />
        <Field label="Status" value={teacher.status} />
      </div>

      <div>
        <p className="label">Classes &amp; subjects</p>
        {scope.pairs.length === 0 ? (
          <p className="text-sm text-slate-400">No assignments yet.</p>
        ) : (
          <div className="space-y-2">
            {scope.classIds.map((cid) => (
              <div key={cid} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">{classNameOf(cid)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {scope.pairs.filter((p) => p.classId === cid).map((p) => (
                    <Badge key={p.subjectId} tone="brand">{subjectName(p.subjectId)}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="label">Class teacher of</p>
        {classTeacherOf.length === 0
          ? <p className="text-sm text-slate-400">Not a class teacher.</p>
          : <div className="flex flex-wrap gap-1">{classTeacherOf.map((c) => <Badge key={c.id} tone="violet">{c.name}</Badge>)}</div>}
      </div>

      <Link href="/admin/staff" className="btn-ghost inline-flex">
        <UserCheck className="h-4 w-4" /> Edit full profile
      </Link>
    </div>
  );
}

function Field({
  label, value, icon, mono,
}: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {icon}{label}
      </p>
      <p className={`mt-0.5 truncate text-sm font-medium capitalize text-slate-800 ${mono ? "font-mono text-xs normal-case" : ""}`} title={value}>
        {value}
      </p>
    </div>
  );
}
