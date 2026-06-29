"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Stat } from "@/components/ui";
import { isDemoMode, isFirebaseConfigured, PARENT_EMAIL_DOMAIN } from "@/lib/firebase";
import {
  Settings, Database, ShieldCheck, KeyRound, Mail, RefreshCw, CheckCircle2, AlertCircle,
  Server, Cloud,
} from "lucide-react";

export default function AdminSettings() {
  const data = useData();
  const [reset, setReset] = useState(false);

  const doReset = () => {
    data.resetDemo();
    setReset(true);
    setTimeout(() => setReset(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">School profile, deployment and data configuration.</p>
      </div>

      {/* School profile */}
      <Card>
        <CardHeader title="School Profile" icon={<Settings className="h-5 w-5" />} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="School Name" value="El-Node Pre-Primary" />
          <Field label="Academic Year" value="2025 – 2026" />
          <Field label="Classes" value={`${data.classes.length}`} />
          <Field label="Students" value={`${data.students.length}`} />
          <Field label="Staff" value={`${data.staff.length}`} />
          <Field label="Currency" value="INR (₹)" />
          <Field label="Location" value="Pune, India" />
          <Field label="Contact" value="admin@elnode.school" />
        </div>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader title="Authentication" icon={<ShieldCheck className="h-5 w-5" />} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-brand-700">
              <KeyRound className="h-5 w-5" />
              <p className="font-semibold">Parents</p>
            </div>
            <p className="mt-1 text-sm text-slate-500">Sign in with a <strong>7-digit admission number</strong> + PIN. Internally mapped to <code className="rounded bg-slate-100 px-1 text-xs">&lt;number&gt;@{PARENT_EMAIL_DOMAIN}</code>.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Mail className="h-5 w-5" />
              <p className="font-semibold">Staff</p>
            </div>
            <p className="mt-1 text-sm text-slate-500">Teachers, accountants and admins sign in with their <strong>work email</strong> + password via Firebase Auth.</p>
          </div>
        </div>
      </Card>

      {/* Deployment / data source */}
      <Card>
        <CardHeader title="Deployment & Data Source" icon={<Cloud className="h-5 w-5" />} />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5">
              <Server className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Hosting</span>
              <Badge tone="brand">Vercel</Badge>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5">
              <Database className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Database</span>
              {isFirebaseConfigured
                ? <Badge tone="green"><CheckCircle2 className="h-3.5 w-3.5" /> Firebase connected</Badge>
                : <Badge tone="amber"><AlertCircle className="h-3.5 w-3.5" /> Demo data</Badge>}
            </div>
          </div>

          {isDemoMode ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-800">
              <p className="font-semibold">Running in demo mode</p>
              <p className="mt-1">
                No Firebase credentials detected. The app is using a seeded dataset stored in your browser.
                To go live, set the <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_FIREBASE_*</code> environment
                variables in Vercel and redeploy — authentication and data automatically switch to Firebase.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Firebase is connected.</p>
              <p className="mt-1">Authentication and Firestore are active for this deployment.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Danger / demo controls */}
      {isDemoMode && (
        <Card>
          <CardHeader title="Demo Data" icon={<RefreshCw className="h-5 w-5" />} />
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Reset all demo data (students, attendance, fees, updates) back to the seeded sample set.</p>
            <button onClick={doReset} className="btn-ghost">
              <RefreshCw className="h-4 w-4" /> {reset ? "Reset done ✓" : "Reset demo data"}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
