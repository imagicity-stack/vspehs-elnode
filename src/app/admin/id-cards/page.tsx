"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useData } from "@/lib/store";
import { IdCard } from "@/components/IdCard";
import { Card, EmptyState, Loading } from "@/components/ui";
import { fullName } from "@/lib/utils";
import { CreditCard, Search, Printer, CheckSquare, Square } from "lucide-react";

function IdCardsInner() {
  const data = useData();
  const params = useSearchParams();

  const [classId, setClassId] = useState(params.get("class") ?? "all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(params.get("student") ? [params.get("student") as string] : []),
  );

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

  const selectedStudents = data.students.filter((s) => selected.has(s.id));
  const classNameOf = (cid: string) => data.classes.find((c) => c.id === cid)?.name ?? "—";

  const toggle = (id: string) =>
    setSelected((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllFiltered = () => setSelected((cur) => new Set([...cur, ...filtered.map((s) => s.id)]));
  const clearSel = () => setSelected(new Set());

  const printCards = () => {
    if (selected.size === 0) return;
    document.body.classList.add("printing-cards");
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ID Cards</h1>
          <p className="mt-1 text-sm text-slate-500">Generate and download student ID cards (front &amp; back).</p>
        </div>
        <button onClick={printCards} disabled={selected.size === 0} className="btn-primary shrink-0">
          <Printer className="h-4 w-4" /> Download / Print ({selected.size})
        </button>
      </div>

      {/* Selection panel */}
      <Card className="no-print">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input sm:w-52">
            <option value="all">All classes</option>
            {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input pl-9 sm:w-56" />
            </div>
            <button onClick={selectAllFiltered} className="btn-ghost whitespace-nowrap text-sm">Select all</button>
            {selected.size > 0 && <button onClick={clearSel} className="btn-ghost whitespace-nowrap text-sm">Clear</button>}
          </div>
        </div>

        {data.loading && data.students.length === 0 ? (
          <Loading label="Loading students…" />
        ) : filtered.length === 0 ? (
          <div className="p-8"><EmptyState icon={<CreditCard className="h-8 w-8" />} title={data.students.length === 0 ? "No students yet" : "No students match"} /></div>
        ) : (
          <div className="grid gap-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const on = selected.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${on ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  {on ? <CheckSquare className="h-4 w-4 shrink-0 text-brand-600" /> : <Square className="h-4 w-4 shrink-0 text-slate-300" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{fullName(s)}</p>
                    <p className="truncate text-xs text-slate-400">{s.admissionNo} · {classNameOf(s.classId)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* On-screen preview */}
      {selectedStudents.length === 0 ? (
        <Card className="no-print p-8">
          <EmptyState icon={<CreditCard className="h-8 w-8" />} title="Select students to preview their ID cards" hint="Pick students above, then Download / Print." />
        </Card>
      ) : (
        <div className="no-print flex flex-wrap justify-center gap-6 lg:justify-start">
          {selectedStudents.map((s) => (
            <IdCard key={s.id} student={s} className={classNameOf(s.classId)} />
          ))}
        </div>
      )}

      {/* Isolated print portal — card-sized pages, no app chrome */}
      {mounted && createPortal(
        <div className="print-cards-portal">
          {selectedStudents.map((s) => (
            <IdCard key={s.id} student={s} className={classNameOf(s.classId)} />
          ))}
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
