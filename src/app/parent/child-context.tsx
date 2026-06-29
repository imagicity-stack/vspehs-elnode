"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { Student } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { fullName } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface ChildContextValue {
  child?: Student;
  children: Student[];
  setChildId: (id: string) => void;
}
const Ctx = createContext<ChildContextValue | null>(null);

export function ChildProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { students } = useData();
  const mine = useMemo(
    () => students.filter((s) => user?.studentIds?.includes(s.id)),
    [students, user],
  );
  const [childId, setChildId] = useState<string | undefined>(undefined);
  const active = mine.find((s) => s.id === childId) ?? mine[0];

  return (
    <Ctx.Provider value={{ child: active, children: mine, setChildId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChild() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChild must be used within ChildProvider");
  return ctx;
}

/** Inline child switcher — only renders a dropdown when there are siblings. */
export function ChildSwitcher() {
  const { child, children, setChildId } = useChild();
  const [open, setOpen] = useState(false);
  if (!child) return null;
  if (children.length <= 1) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-card">
        <Avatar name={fullName(child)} src={child.photoUrl} size={38} />
        <div>
          <p className="text-sm font-semibold text-slate-900">{fullName(child)}</p>
          <p className="text-xs text-slate-400">Admission #{child.admissionNo}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-card hover:bg-slate-50"
      >
        <Avatar name={fullName(child)} src={child.photoUrl} size={38} />
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-900">{fullName(child)}</p>
          <p className="text-xs text-slate-400">Tap to switch child</p>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => { setChildId(c.id); setOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
              >
                <Avatar name={fullName(c)} src={c.photoUrl} size={32} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{fullName(c)}</p>
                  <p className="text-xs text-slate-400">#{c.admissionNo}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
