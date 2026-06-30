"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Invoice, InvoiceLine } from "@/lib/types";
import { inr } from "@/lib/utils";
import { CheckCircle2, X, CalendarClock, Loader2, Users } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${MONTHS[Number(m) - 1] ?? "?"} ${y}`;
}

export function RaiseFeesModal({ onClose }: { onClose: () => void }) {
  const data = useData();
  const { user } = useAuth();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [scope, setScope] = useState<string>("all"); // "all" or a classId
  const [dueDate, setDueDate] = useState(`${defaultMonth}-08`); // default: 8th
  const [done, setDone] = useState<{ created: number; skipped: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const period = monthLabel(month);
  const monthlyHeads = useMemo(() => data.feeHeads.filter((f) => f.frequency === "monthly"), [data.feeHeads]);

  // Build the invoice that *would* be raised for a student (or null to skip).
  const buildInvoice = (studentId: string, classId: string, seq: number): Omit<Invoice, "id"> | null => {
    const lines: InvoiceLine[] = monthlyHeads
      .filter((f) => f.appliesTo === "all" || (f.appliesTo as string[]).includes(classId))
      .map((f) => ({ feeHeadId: f.id, name: f.name, amount: f.amount }));
    if (lines.length === 0) return null;
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);

    // Apply a still-valid concession if the student has one.
    const today = new Date().toISOString().slice(0, 10);
    const con = data.concessions.find((c) => c.studentId === studentId && c.validTill >= today);
    const discount = con
      ? con.type === "percent" ? Math.round((subtotal * con.value) / 100) : Math.min(con.value, subtotal)
      : 0;

    return {
      invoiceNo: `INV-${month.replace("-", "")}-${String(seq).padStart(4, "0")}`,
      studentId, period,
      lines, discount, concessionId: con?.id,
      total: subtotal - discount, paid: 0,
      dueDate, issuedDate: today, status: "pending",
    };
  };

  // Preview: which active, in-scope students would be billed (skipping any
  // already invoiced for this period).
  const preview = useMemo(() => {
    const eligible = data.students.filter(
      (s) => s.status === "active" && (scope === "all" || s.classId === scope),
    );
    let created = 0, skipped = 0, total = 0, seq = data.invoices.length + 1;
    for (const s of eligible) {
      const already = data.invoices.some((i) => i.studentId === s.id && i.period === period);
      if (already) { skipped++; continue; }
      const inv = buildInvoice(s.id, s.classId, seq);
      if (!inv) { skipped++; continue; }
      created++; total += inv.total; seq++;
    }
    return { created, skipped, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.students, data.invoices, data.feeHeads, data.concessions, scope, month, dueDate]);

  const raise = () => {
    setBusy(true);
    const eligible = data.students.filter(
      (s) => s.status === "active" && (scope === "all" || s.classId === scope),
    );
    let created = 0, skipped = 0, total = 0, seq = data.invoices.length + 1;
    for (const s of eligible) {
      const already = data.invoices.some((i) => i.studentId === s.id && i.period === period);
      if (already) { skipped++; continue; }
      const inv = buildInvoice(s.id, s.classId, seq);
      if (!inv) { skipped++; continue; }
      data.generateInvoice(inv);
      created++; total += inv.total; seq++;
    }
    setBusy(false);
    setDone({ created, skipped, total });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>

        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
            <h3 className="text-lg font-bold text-slate-900">Fee request raised</h3>
            <p className="mt-1 text-sm text-slate-500">
              {done.created} invoice{done.created !== 1 ? "s" : ""} for {period} ({inr(done.total)} billed)
              {done.skipped > 0 && <> · {done.skipped} skipped (already billed or no fees)</>}.
            </p>
            <p className="mt-2 text-xs text-slate-400">Parents can now see and pay these in their portal.</p>
            <button onClick={onClose} className="btn-primary mt-5 w-full py-3">Done</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-900">Raise Monthly Fees</h3>
            <p className="text-sm text-slate-500">Generate invoices from the monthly fee heads for a billing period.</p>

            {monthlyHeads.length === 0 && (
              <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                No monthly fee heads exist yet. Ask the admin to add them in Fee Heads first.
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Billing month</label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => { setMonth(e.target.value); setDueDate(`${e.target.value}-08`); }}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Due date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Apply to</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)} className="input">
                  <option value="all">All classes</option>
                  {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Students to bill</span>
                <span className="font-semibold text-slate-900">{preview.created}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> Due</span>
                <span className="font-semibold text-slate-900">{dueDate}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-slate-600">
                <span>Total to be billed</span>
                <span className="font-bold text-slate-900">{inr(preview.total)}</span>
              </div>
              {preview.skipped > 0 && (
                <p className="text-xs text-slate-400">{preview.skipped} student(s) skipped — already billed for {period} or no applicable fees.</p>
              )}
            </div>

            <button
              onClick={raise}
              disabled={busy || preview.created === 0}
              className="btn-primary mt-5 w-full py-3"
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Raising…</> : `Raise ${preview.created} invoice${preview.created !== 1 ? "s" : ""}`}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">Raised by {user?.displayName ?? "accountant"}</p>
          </>
        )}
      </div>
    </div>
  );
}
