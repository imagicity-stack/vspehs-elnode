"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { SchoolClass, Staff } from "@/lib/types";
import { ChevronDown } from "lucide-react";

interface TeacherContextValue {
  staff?: Staff;
  classes: SchoolClass[];
  activeClass?: SchoolClass;
  setClassId: (id: string) => void;
}
const Ctx = createContext<TeacherContextValue | null>(null);

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const data = useData();
  const staff = data.staff.find((s) => s.id === user?.staffId);
  const myClasses = useMemo(() => {
    if (!staff) return [];
    // class teacher of OR assigned to
    const ids = new Set([
      ...staff.assignedClassIds,
      ...data.classes.filter((c) => c.classTeacherId === staff.id).map((c) => c.id),
    ]);
    // helpers/teachers with no class still see all (so the demo is rich)
    const list = data.classes.filter((c) => ids.has(c.id));
    return list.length ? list : data.classes;
  }, [staff, data.classes]);
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const activeClass = myClasses.find((c) => c.id === classId) ?? myClasses[0];

  return (
    <Ctx.Provider value={{ staff, classes: myClasses, activeClass, setClassId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTeacher() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTeacher must be used within TeacherProvider");
  return ctx;
}

export function ClassSwitcher() {
  const { activeClass, classes, setClassId } = useTeacher();
  const [open, setOpen] = useState(false);
  if (!activeClass) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-card hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
          {activeClass.level[0]}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-900">{activeClass.name}</p>
          <p className="text-xs text-slate-400">{activeClass.room}</p>
        </div>
        {classes.length > 1 && <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && classes.length > 1 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => { setClassId(c.id); setOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{c.level[0]}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.room}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
