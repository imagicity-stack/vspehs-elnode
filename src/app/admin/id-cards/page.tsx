"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useData } from "@/lib/store";
import { IdCard } from "@/components/IdCard";
import { StaffIdCard, designationOf } from "@/components/StaffIdCard";
import { Card, EmptyState, Loading } from "@/components/ui";
import { fullName, rollLabel } from "@/lib/utils";
import { StaffRole } from "@/lib/types";
import { CreditCard, Search, Printer, CheckSquare, Square, Users, GraduationCap } from "lucide-react";

/** 31 March of the current academic session — the usual expiry for a staff card. */
function sessionEnd(now = new Date()) {
  const endYear = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
  return `${endYear}-03-31`;
}

function IdCardsInner() {
  const data = useData();
  const params = useSearchParams();

  const [mode, setMode] = useState<"students" | "staff">(
    params.get("type") === "staff" || params.get("staff") ? "staff" : "students",
  );
  const [classId, setClassId] = useState(params.get("class") ?? "all");
  const [role, setRole] = useState<"all" | StaffRole>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(params.get("student") ? [params.get("student") as string] : []),
  );
  const [staffSelected, setStaffSelected] = useState<Set<string>>(
    () => new Set(params.get("staff") ? [params.get("staff") as string] : []),
  );
  const [validTill, setValidTill] = useState(sessionEnd);
  const [showValidity, setShowValidity] = useState(true);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Remove the body class once printing finishes.
  useEffect(() => {
    const clear = () => document.body.classList.remove("printing-cards");
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  const filtered = useMemo(
    () =>
      data.students
        .filter((s) => classId === "all" || s.classId === classId)
        .filter((s) => !q || fullName(s).toLowerCase().includes(q.toLowerCase()) || s.admissionNo.includes(q))
        .sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [data.students, classId, q],
  );

  const filteredStaff = useMemo(
    () =>
      data.staff
        .filter((s) => s.status !== "inactive")
        .filter((s) => role === "all" || s.role === role)
        .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.staffCode.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.staff, role, q],
  );

  const selectedStudents = data.students.filter((s) => selected.has(s.id));
  const selectedStaff = data.staff.filter((s) => staffSelected.has(s.id));
  const classNameOf = (cid: string) => data.classes.find((c) => c.id === cid)?.name ?? "—";

  const isStaffMode = mode === "staff";
  const count = isStaffMode ? staffSelected.size : selected.size;

  const toggle = (id: string) => {
    const setter = isStaffMode ? setStaffSelected : setSelected;
    setter((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAllFiltered = () =>
    isStaffMode
      ? setStaffSelected((cur) => new Set([...cur, ...filteredStaff.map((s) => s.id)]))
      : setSelected((cur) => new Set([...cur, ...filtered.map((s) => s.id)]));
  const clearSel = () => (isStaffMode ? setStaffSelected(new Set()) : setSelected(new Set()));

  const printCards = () => {
    if (count === 0) return;
    document.body.classList.add("printing-cards");
    setTimeout(() => window.print(), 50);
  };

  const stamp = showValidity ? validTill : undefined;
  const rows: { id: string; title: string; subtitle: string }[] = isStaffMode
    ? filteredStaff.map((s) => ({ id: s.id, title: s.name, subtitle: `${s.staffCode} · ${designationOf(s)}` }))
    : filtered.map((s) => ({
      id: s.id, title: fullName(s),
      subtitle: `${s.admissionNo} · ${classNameOf(s.classId)} · Roll ${rollLabel(s.rollNo)}`,
    }));
  const selectedIds = isStaffMode ? staffSelected : selected;
  const listEmpty = isStaffMode ? data.staff.length === 0 : data.students.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ID Cards</h1>
          <p className="mt-1 text-sm text-slate-500">Generate and download ID cards (front &amp; back).</p>
        </div>
        <button onClick={printCards} disabled={count === 0} className="btn-primary shrink-0">
          <Printer className="h-4 w-4" /> Download / Print ({count})
        </button>
      </div>

      {/* Students / Staff switch */}
      <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-card no-print">
        {([
          ["students", "Students", Users],
          ["staff", "Staff", GraduationCap],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => { setMode(key); setQ(""); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === key ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Selection panel */}
      <Card className="no-print">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          {isStaffMode ? (
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="input capitalize sm:w-52">
              <option value="all">All roles</option>
              {(["teacher", "accountant", "helper", "superadmin"] as StaffRole[]).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ) : (
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input sm:w-52">
              <option value="all">All classes</option>
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input pl-9 sm:w-56" />
            </div>
            <button onClick={selectAllFiltered} className="btn-ghost whitespace-nowrap text-sm">Select all</button>
            {count > 0 && <button onClick={clearSel} className="btn-ghost whitespace-nowrap text-sm">Clear</button>}
          </div>
        </div>

        {isStaffMode && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={showValidity}
                onChange={(e) => setShowValidity(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-600"
              />
              Print &ldquo;valid till&rdquo;
            </label>
            <input
              type="date"
              value={validTill}
              disabled={!showValidity}
              onChange={(e) => setValidTill(e.target.value)}
              className="input w-44 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        )}

        {data.loading && rows.length === 0 ? (
          <Loading label={`Loading ${mode}…`} />
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<CreditCard className="h-8 w-8" />}
              title={listEmpty ? `No ${mode} yet` : `No ${mode} match`}
            />
          </div>
        ) : (
          <div className="grid gap-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => {
              const on = selectedIds.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${on ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  {on ? <CheckSquare className="h-4 w-4 shrink-0 text-brand-600" /> : <Square className="h-4 w-4 shrink-0 text-slate-300" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                    <p className="truncate text-xs text-slate-400">{r.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* On-screen preview */}
      {count === 0 ? (
        <Card className="no-print p-8">
          <EmptyState
            icon={<CreditCard className="h-8 w-8" />}
            title={`Select ${mode} to preview their ID cards`}
            hint="Pick from the list above, then Download / Print."
          />
        </Card>
      ) : (
        <div className="no-print flex flex-wrap justify-center gap-6 lg:justify-start">
          {isStaffMode
            ? selectedStaff.map((s) => <StaffIdCard key={s.id} staff={s} validTill={stamp} />)
            : selectedStudents.map((s) => <IdCard key={s.id} student={s} className={classNameOf(s.classId)} />)}
        </div>
      )}

      {/* Isolated print portal — card-sized pages, no app chrome */}
      {mounted && createPortal(
        <div className="print-cards-portal">
          {isStaffMode
            ? selectedStaff.map((s) => <StaffIdCard key={s.id} staff={s} validTill={stamp} />)
            : selectedStudents.map((s) => <IdCard key={s.id} student={s} className={classNameOf(s.classId)} />)}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function AdminIdCards() {
  return (
    <Suspense fallback={<div className="p-8"><Loading /></div>}>
      <IdCardsInner />
    </Suspense>
  );
}
