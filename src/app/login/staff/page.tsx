"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, portalHome } from "@/lib/auth";
import { isDemoMode } from "@/lib/firebase";
import { AuthLayout } from "@/components/AuthLayout";
import { Role } from "@/lib/types";
import { ArrowRight, Mail, Lock, GraduationCap, Calculator, ShieldCheck, Users } from "lucide-react";

const demoAccounts: { role: Role; email: string; label: string; icon: any }[] = [
  { role: "teacher", email: "anita@elnode.school", label: "Teacher", icon: GraduationCap },
  { role: "accountant", email: "accounts@elnode.school", label: "Accountant", icon: Calculator },
  { role: "superadmin", email: "admin@elnode.school", label: "Super Admin", icon: ShieldCheck },
];

export default function StaffLogin() {
  const { loginStaff, demoLoginAs } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await loginStaff(email, password || "demo");
      router.replace(portalHome[u.role]);
    } catch (e: any) {
      setErr(e.message ?? "Login failed.");
      setBusy(false);
    }
  };

  const quick = (role: Role) => {
    const u = demoLoginAs(role);
    router.replace(portalHome[u.role]);
  };

  return (
    <AuthLayout title="Staff Sign In" subtitle="Use your work email to access your portal.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Work Email</label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@elnode.school"
              className="input pl-10"
              autoFocus
            />
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>
        <div>
          <label className="label">Password {isDemoMode && <span className="text-slate-400">(any value in demo)</span>}</label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input pl-10"
            />
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {isDemoMode && (
        <div className="mt-6">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            One-click demo
          </p>
          <div className="grid grid-cols-3 gap-2">
            {demoAccounts.map((a) => (
              <button
                key={a.role}
                onClick={() => quick(a.role)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center transition hover:border-brand-300 hover:bg-brand-50"
              >
                <a.icon className="h-5 w-5 text-brand-600" />
                <span className="text-xs font-semibold text-slate-700">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-700">
          <Users className="h-4 w-4" /> Parent? Sign in with admission number
        </Link>
      </div>
    </AuthLayout>
  );
}
