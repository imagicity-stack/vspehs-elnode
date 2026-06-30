"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/store";
import { Student, InvoiceLine } from "@/lib/types";
import { inr, fullName } from "@/lib/utils";
import { CheckCircle2, X, Loader2 } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => { const [y, mm] = m.split("-"); return `${MONTHS[Number(mm) - 1] ?? "?"} ${y}`; };

export function RaiseStudentFeeModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const data = useData();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [dueDate, setDueDate] = useState(`${defaultMonth}-08`);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fee heads that apply to this student's class.
  const applicable = useMemo(
    () => data.feeHeads.filter((f) => f.appliesTo === "all" || (f.appliesTo as string[]).includes(student.classId)),
    [data.feeHeads, student.classId],
  );
  // Default selection: the monthly heads (one-time/exam heads are opt-in).
  const [selected, setSelected] = useState<string[]>(
    applicable.filter((f) => f.frequency === "monthly").map((f) => f.id),
  );
  const toggle = (id: string) => setSelected((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const period = monthLabel(month);
  const lines: InvoiceLine[] = applicable
    .filter((f) => selected.includes(f.id))
    .map((f) => ({ feeHeadId: f.id, name: f.name, amount: f.amount }));
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  const today = new Date().toISOString().slice(0, 10);
  const con = data.concessions.find((c) => c.studentId === student.id && c.validTill >= today);
  const discount = con ? (con.type === "percent" ? Math.round((subtotal * con.value) / 100) : Math.min(con.value, subtotal)) : 0;
  const total = subtotal - discount;

  const alreadyForPeriod = data.invoices.some((i) => i.studentId === student.id && i.period === period);

  const raise = () => {
    if (lines.length === 0) return;
    setBusy(true);
    data.generateInvoice({
      invoiceNo: `INV-${month.replace("-", "")}-${String(data.invoices.length + 1).padStart(4, "0")}`,
      studentId: student.id,
      period,
      lines,
      discount,
      concessionId: con?.id,
      total,
      paid: 0,
      dueDate,
      issuedDate: today,
      status: "pending",
    });
    setBusy(false);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>

        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
            <h3 className="text-lg font-bold text-slate-900">Fee request raised</h3>
            <p className="mt-1 text-sm text-slate-500">{inr(total)} billed to {fullName(student)} for {period}. It now shows in their parent portal.</p>
            <button onClick={onClose} className="btn-primary mt-5 w-full py-3">Done</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-900">Raise Fee</h3>
            <p className="text-sm text-slate-500">{fullName(student)} · {student.admissionNo}</p>

            {applicable.length === 0 ? (
              <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                No fee heads apply to this student&apos;s class. Add them in admin Fee Heads first.
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Billing month</label>
                    <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setDueDate(`${e.target.value}-08`); }} className="input" />
                  </div>
                  <div>
                    <label className="label">Due date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="label">Fee heads</label>
                  <div className="space-y-1.5 rounded-xl border border-slate-200 p-2">
                    {applicable.map((f) => (
                      <label key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                        <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} className="h-3.5 w-3.5 accent-brand-600" />
                        <span className="flex-1 text-sm text-slate-700">{f.name}</span>
                        <span className="text-xs capitalize text-slate-400">{f.frequency}</span>
                        <span className="text-sm font-semibold text-slate-700">{inr(f.amount)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Concession</span><span>− {inr(discount)}</span></div>}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900"><span>Total</span><span>{inr(total)}</span></div>
                </div>

                {alreadyForPeriod && (
                  <p className="mt-2 text-xs text-amber-600">Note: this student already has an invoice for {period}. This creates an additional one.</p>
                )}

                <button onClick={raise} disabled={busy || lines.length === 0} className="btn-primary mt-5 w-full py-3">
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Raising…</> : `Raise ${inr(total)}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
