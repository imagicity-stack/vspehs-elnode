"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, portalHome } from "@/lib/auth";
import { useData } from "@/lib/store";
import { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { toast } from "@/components/Toast";
import { isDemoMode } from "@/lib/firebase";
import {
  LogOut, Menu, X, GraduationCap, ChevronDown, BellRing, KeyRound, Loader2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleLabel: Record<Role, string> = {
  parent: "Parent Portal",
  teacher: "Teacher Portal",
  accountant: "Accounts Portal",
  superadmin: "Super Admin",
};

export function PortalShell({
  role, nav, children,
}: { role: Role; nav: NavItem[]; children: React.ReactNode }) {
  const { user, loading, logout, canChangePassword } = useAuth();
  const { loading: dataLoading } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user && user.role !== role) router.replace(portalHome[user.role]);
  }, [loading, user, role, router]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
          <p className="text-sm">Loading El-Node…</p>
        </div>
      </div>
    );
  }

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-extrabold leading-none tracking-tight text-slate-900">El-Node</p>
          <p className="text-[11px] font-medium text-slate-400">{roleLabel[role]}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== portalHome[role] && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn("nav-link", active && "nav-link-active")}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.displayName} src={user.photoUrl} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{user.displayName}</p>
            <p className="truncate text-xs text-slate-400">{user.email ?? `#${user.admissionNo}`}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {Sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">{Sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Live data-loading bar */}
        {dataLoading && (
          <div className="fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-brand-100 lg:left-64">
            <div className="h-full w-1/3 animate-progress rounded-full bg-brand-500" />
          </div>
        )}

        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{roleLabel[role]}</p>
              {isDemoMode && <p className="text-[11px] font-medium text-amber-600">Demo mode · sample data</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <BellRing className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-2.5 hover:bg-slate-50"
              >
                <Avatar name={user.displayName} src={user.photoUrl} size={28} />
                <span className="hidden text-sm font-medium text-slate-700 sm:block">{user.displayName.split(" ")[0]}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-slate-800">{user.displayName}</p>
                      <p className="text-xs text-slate-400">{user.email ?? `Admission #${user.admissionNo}`}</p>
                    </div>
                    {canChangePassword && (
                      <button
                        onClick={() => { setMenu(false); setPwOpen(true); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <KeyRound className="h-4 w-4" /> Change password
                      </button>
                    )}
                    <button
                      onClick={async () => { await logout(); router.replace("/login"); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl animate-fade-in px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {pwOpen && <ChangePasswordModal isParent={role === "parent"} onClose={() => setPwOpen(false)} />}
    </div>
  );
}

// ── Change password modal ─────────────────────────────────────
function ChangePasswordModal({ isParent, onClose }: { isParent: boolean; onClose: () => void }) {
  const { changePassword } = useAuth();
  const noun = isParent ? "PIN" : "password";
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const valid = current.length > 0 && next.length >= 6 && next === confirm;

  const submit = async () => {
    setErr("");
    if (next !== confirm) { setErr(`New ${noun}s don't match.`); return; }
    if (next.length < 6) { setErr(`New ${noun} must be at least 6 characters.`); return; }
    setBusy(true);
    try {
      await changePassword(current, next);
      toast.success(`Your ${noun} has been changed.`);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : `Couldn't change ${noun}.`);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">Change {noun}</h3>
        <p className="text-sm text-slate-500">Enter your current {noun} and choose a new one.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Current {noun}</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="input" autoFocus />
          </div>
          <div>
            <label className="label">New {noun}</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="input" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="label">Confirm new {noun}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" />
          </div>
          {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={submit} disabled={!valid || busy} className="btn-primary flex-1 py-2.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Update ${noun}`}
          </button>
        </div>
      </div>
    </div>
  );
}
