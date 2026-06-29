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
  const { loginStaff, loginWithGoogle, demoLoginAs } = useAuth();
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

  const google = async () => {
    setErr("");
    setBusy(true);
    try {
      const u = await loginWithGoogle();
      router.replace(portalHome[u.role]);
    } catch (e: any) {
      setErr(e.message ?? "Google sign-in failed.");
      setBusy(false);
    }
  };

  const quick = (role: Role) => {
    const u = demoLoginAs(role);
    router.replace(portalHome[u.role]);
  };

  return (
    <AuthLayout title="Staff Sign In" subtitle="Use your work email to access your portal.">
      {/* Super Admin — Google sign-in */}
      <button onClick={google} disabled={busy} className="btn-ghost mb-4 w-full py-3">
        <GoogleIcon /> Super Admin — Continue with Google
      </button>
      <div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or staff email <span className="h-px flex-1 bg-slate-200" />
      </div>

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

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
