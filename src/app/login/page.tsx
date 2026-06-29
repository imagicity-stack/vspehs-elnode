"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isDemoMode } from "@/lib/firebase";
import { AuthLayout } from "@/components/AuthLayout";
import { ArrowRight, KeyRound, Briefcase, Sparkles } from "lucide-react";

export default function ParentLogin() {
  const { loginParent } = useAuth();
  const router = useRouter();
  const [admissionNo, setAdmissionNo] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await loginParent(admissionNo, pin || "demo");
      router.replace("/parent");
    } catch (e: any) {
      setErr(e.message ?? "Login failed.");
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Parent Sign In"
      subtitle="Enter your child's 7-digit admission number to continue."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Admission Number</label>
          <div className="relative">
            <input
              inputMode="numeric"
              maxLength={7}
              value={admissionNo}
              onChange={(e) => setAdmissionNo(e.target.value.replace(/\D/g, "").slice(0, 7))}
              placeholder="7-digit number"
              className="input pl-10 tracking-[0.3em]"
              autoFocus
            />
            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>
        <div>
          <label className="label">PIN {isDemoMode && <span className="text-slate-400">(any value in demo)</span>}</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="input"
          />
        </div>
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {isDemoMode && (
        <div className="mt-5 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            <Sparkles className="h-4 w-4" /> Demo mode
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Firebase is not connected. Enter any 7-digit number to preview the parent portal with empty data.
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <Link href="/login/staff" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-700">
          <Briefcase className="h-4 w-4" /> Staff member? Sign in here
        </Link>
      </div>
    </AuthLayout>
  );
}
