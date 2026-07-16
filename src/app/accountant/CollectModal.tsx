"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { downloadReceipt } from "@/lib/receipt";
import { Invoice, PaymentMethod, Payment } from "@/lib/types";
import { inr, fullName } from "@/lib/utils";
import { CheckCircle2, X, Download } from "lucide-react";

export function CollectModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const data = useData();
  const { user } = useAuth();
  const student = data.students.find((s) => s.id === invoice.studentId);
  const remaining = invoice.total - invoice.paid;
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [ref, setRef] = useState("");
  const [paid, setPaid] = useState<Payment | null>(null);

  const collect = () => {
    const p = data.recordPayment({
      invoiceId: invoice.id, studentId: invoice.studentId, amount, method,
      collectedBy: user?.staffId ?? "s-ravi", reference: ref || undefined,
    });
    setPaid(p);
  };

  const download = () => {
    if (!paid) return;
    downloadReceipt({
      payment: paid,
      invoice,
      student,
      className: data.classes.find((c) => c.id === student?.classId)?.name,
      collectedByName: user?.displayName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        {paid ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
            <h3 className="text-lg font-bold text-slate-900">Payment recorded</h3>
            <p className="mt-1 text-sm text-slate-500">Receipt <span className="font-semibold text-slate-700">{paid.receiptNo}</span> · {inr(amount)} from {student ? fullName(student) : ""}.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={download} className="btn-ghost flex-1"><Download className="h-4 w-4" /> Download PDF</button>
              <button onClick={onClose} className="btn-primary flex-1">Done</button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-900">Collect Fees</h3>
            <p className="text-sm text-slate-500">{student ? fullName(student) : ""} · {invoice.invoiceNo} · {invoice.period}</p>
            <div className="mt-4 flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Outstanding</span>
              <span className="font-bold text-slate-900">{inr(remaining)}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Amount received</label>
                <input type="number" value={amount} min={1} max={remaining} onChange={(e) => setAmount(Math.min(remaining, Math.max(0, Number(e.target.value))))} className="input" />
              </div>
              <div>
                <label className="label">Method</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(["cash", "upi", "card", "netbanking", "cheque"] as PaymentMethod[]).map((m) => (
                    <button key={m} onClick={() => setMethod(m)} className={`rounded-lg border px-1 py-2 text-[10px] font-bold uppercase ${method === m ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Transaction ID {method === "cash" ? "(optional)" : ""}</label>
                <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UPI / bank txn / cheque no." className="input" />
              </div>
            </div>
            <button onClick={collect} disabled={amount <= 0} className="btn-primary mt-5 w-full py-3">Record {inr(amount)}</button>
          </>
        )}
      </div>
    </div>
  );
}
