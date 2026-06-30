"use client";

import { useState } from "react";
import { useChild, ChildSwitcher } from "../child-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Stat, EmptyState, Table, Th, Td, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { inr, formatDate, fullName } from "@/lib/utils";
import { isDemoMode } from "@/lib/firebase";
import {
  isRazorpayConfigured, RAZORPAY_KEY_ID, loadRazorpayScript,
  createRazorpayOrder, verifyRazorpayPayment,
} from "@/lib/razorpay";
import { Wallet, Receipt, CheckCircle2, IndianRupee, X, ShieldCheck, Loader2 } from "lucide-react";
import { Invoice, InvoiceStatus, PaymentMethod } from "@/lib/types";

const statusTone: Record<InvoiceStatus, "green" | "amber" | "red" | "sky"> = {
  paid: "green", partial: "sky", pending: "amber", overdue: "red",
};

export default function ParentFees() {
  const { child } = useChild();
  const data = useData();
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  if (!child) return <EmptyState title="No child linked." />;

  // Only outstanding invoices are shown here — once fully paid (online or
  // collected by the accountant) they drop off and live in Payment Receipts.
  const invoices = data.invoices
    .filter((i) => i.studentId === child.id && i.status !== "paid")
    .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
  const receipts = data.payments
    .filter((p) => p.studentId === child.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalDue = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.total - i.paid), 0);
  const paidYtd = receipts.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fees</h1>
          <p className="mt-1 text-sm text-slate-500">Invoices, dues and payment receipts for {child.firstName}.</p>
        </div>
        <ChildSwitcher />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Outstanding" value={inr(totalDue)} tone={totalDue > 0 ? "amber" : "green"} icon={<Wallet className="h-5 w-5" />} hint={totalDue > 0 ? "Please clear dues" : "All paid 🎉"} />
        <Stat label="Paid This Year" value={inr(paidYtd)} tone="green" icon={<CheckCircle2 className="h-5 w-5" />} />
        <Stat label="Receipts" value={receipts.length} tone="brand" icon={<Receipt className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader title="Outstanding Fees" icon={<IndianRupee className="h-5 w-5" />} />
        {invoices.length === 0 ? (
          <div className="p-5"><EmptyState title="No outstanding fees 🎉" hint="Paid invoices appear under Payment Receipts below." /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Invoice</Th><Th>Period</Th><Th>Amount</Th><Th>Paid</Th><Th>Due Date</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">{inv.invoiceNo}</Td>
                  <Td>{inv.period}</Td>
                  <Td className="font-semibold">{inr(inv.total)}</Td>
                  <Td className="text-slate-500">{inr(inv.paid)}</Td>
                  <Td>{formatDate(inv.dueDate)}</Td>
                  <Td><Badge tone={statusTone[inv.status]}>{inv.status}</Badge></Td>
                  <Td>
                    {inv.status !== "paid" && (
                      <button onClick={() => setPayFor(inv)} className="btn-primary px-3 py-1.5 text-xs">Pay {inr(inv.total - inv.paid)}</button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Payment Receipts" icon={<Receipt className="h-5 w-5" />} />
        {receipts.length === 0 ? (
          <div className="p-5"><EmptyState title="No payments yet" /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Receipt</Th><Th>Date</Th><Th>Method</Th><Th>Reference</Th><Th>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {receipts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">{p.receiptNo}</Td>
                  <Td>{formatDate(p.date)}</Td>
                  <Td className="uppercase">{p.method}</Td>
                  <Td className="text-slate-500">{p.reference ?? "—"}</Td>
                  <Td className="font-semibold text-emerald-600">{inr(p.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {payFor && (
        <PayModal invoice={payFor} onClose={() => setPayFor(null)} />
      )}
    </div>
  );
}

function PayModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { recordPayment, students } = useData();
  const { user } = useAuth();
  const student = students.find((s) => s.id === invoice.studentId);
  const remaining = invoice.total - invoice.paid;
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [done, setDone] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // Simulated demo payment (no Razorpay keys configured).
  const payDemo = () => {
    recordPayment({
      invoiceId: invoice.id, studentId: invoice.studentId, amount,
      method, collectedBy: "online", reference: `${method.toUpperCase()}/${Math.floor(Math.random() * 9000 + 1000)}`,
    });
    setDone(true);
  };

  // Live Razorpay checkout: create order → open checkout → verify signature → record.
  const payRazorpay = async () => {
    setError("");
    setProcessing(true);
    try {
      const order = await createRazorpayOrder({
        amount, invoiceId: invoice.id, studentId: invoice.studentId,
      });
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Could not load the payment gateway. Check your connection.");

      const rzp = new (window as any).Razorpay({
        key: order.keyId || RAZORPAY_KEY_ID,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "El-Node Pre-Primary",
        description: `${invoice.invoiceNo} · ${invoice.period}`,
        prefill: {
          name: student ? fullName(student) : user?.displayName,
          contact: student?.primaryContact,
          email: student?.parentEmail || user?.email,
        },
        notes: { invoiceId: invoice.id, admissionNo: student?.admissionNo },
        theme: { color: "#1d40f5" },
        handler: async (resp: any) => {
          const { verified, recorded } = await verifyRazorpayPayment(resp, {
            invoiceId: invoice.id, studentId: invoice.studentId, amount,
          });
          if (!verified) {
            setError("Payment could not be verified. If money was debited it will be refunded.");
            setProcessing(false);
            return;
          }
          // The server records the payment in Firebase mode; only record from
          // the client when it didn't (e.g. local/demo data).
          if (!recorded) {
            recordPayment({
              invoiceId: invoice.id, studentId: invoice.studentId, amount,
              method: "upi", collectedBy: "online", reference: resp.razorpay_payment_id,
            });
          }
          setProcessing(false);
          setDone(true);
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.on("payment.failed", (r: any) => {
        setError(r?.error?.description || "Payment failed. Please try again.");
        setProcessing(false);
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Could not start payment.");
      setProcessing(false);
    }
  };

  const pay = () => {
    if (isRazorpayConfigured) return payRazorpay();
    if (isDemoMode) return payDemo();
    setError("Online payment isn't enabled yet. Please pay at the school office — the accountant can collect it.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Payment successful</h3>
            <p className="mt-1 text-sm text-slate-500">{inr(amount)} paid towards {invoice.invoiceNo}. A receipt has been generated.</p>
            <button onClick={onClose} className="btn-primary mt-5 w-full">Done</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-900">Pay Fees</h3>
            <p className="text-sm text-slate-500">{invoice.invoiceNo} · {invoice.period}</p>
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              {invoice.lines.map((l) => (
                <div key={l.feeHeadId} className="flex justify-between text-slate-600"><span>{l.name}</span><span>{inr(l.amount)}</span></div>
              ))}
              {invoice.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Concession</span><span>− {inr(invoice.discount)}</span></div>}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900"><span>Outstanding</span><span>{inr(remaining)}</span></div>
            </div>
            <div className="mt-4">
              <label className="label">Amount</label>
              <input type="number" value={amount} max={remaining} min={1} onChange={(e) => setAmount(Math.min(remaining, Math.max(0, Number(e.target.value))))} className="input" />
            </div>
            {!isRazorpayConfigured && isDemoMode && (
              <div className="mt-3">
                <label className="label">Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["upi", "card", "netbanking", "cash"] as PaymentMethod[]).map((m) => (
                    <button key={m} onClick={() => setMethod(m)} className={`rounded-xl border px-2 py-2 text-xs font-semibold uppercase ${method === m ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"}`}>{m}</button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
            <button onClick={pay} disabled={amount <= 0 || processing} className="btn-primary mt-5 w-full py-3">
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>Pay {inr(amount)}</>}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isRazorpayConfigured ? "Secured by Razorpay" : isDemoMode ? "Demo mode — no real charge" : "Online payment not enabled"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
