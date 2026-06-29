"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Table, Th, Td, Stat, EmptyState } from "@/components/ui";
import { CollectModal } from "../CollectModal";
import { paymentMethodSplit } from "@/lib/analytics";
import { inr, fullName, formatDate, todayISO } from "@/lib/utils";
import { Invoice } from "@/lib/types";
import { Receipt, Plus, Wallet, Search } from "lucide-react";

export default function AccountantPayments() {
  const data = useData();
  const [picking, setPicking] = useState(false);
  const [collect, setCollect] = useState<Invoice | null>(null);
  const [q, setQ] = useState("");

  const payments = data.payments.slice().sort((a, b) => b.date.localeCompare(a.date));
  const today = todayISO();
  const todayTotal = payments.filter((p) => p.date === today).reduce((s, p) => s + p.amount, 0);
  const monthTotal = payments.reduce((s, p) => s + p.amount, 0);
  const methods = paymentMethodSplit(payments);
  const topMethod = methods.sort((a, b) => b.value - a.value)[0];

  const pendingInvoices = data.invoices
    .filter((i) => i.status !== "paid")
    .filter((i) => {
      if (!q) return true;
      const st = data.students.find((s) => s.id === i.studentId);
      return st && fullName(st).toLowerCase().includes(q.toLowerCase());
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
          <p className="mt-1 text-sm text-slate-500">Record collections and view receipts.</p>
        </div>
        <button onClick={() => setPicking(true)} className="btn-primary"><Plus className="h-4 w-4" /> Record Payment</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Collected Today" value={inr(todayTotal)} tone="green" icon={<Wallet className="h-5 w-5" />} />
        <Stat label="Total Receipts" value={payments.length} tone="brand" icon={<Receipt className="h-5 w-5" />} />
        <Stat label="Top Method" value={topMethod?.name ?? "—"} tone="violet" icon={<Wallet className="h-5 w-5" />} hint={topMethod ? inr(topMethod.value) : ""} />
      </div>

      <Card>
        <CardHeader title="Receipt Ledger" icon={<Receipt className="h-5 w-5" />} />
        {payments.length === 0 ? (
          <div className="p-5"><EmptyState title="No payments recorded yet" /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Receipt</Th><Th>Student</Th><Th>Date</Th><Th>Method</Th><Th>Reference</Th><Th>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.map((p) => {
                const st = data.students.find((s) => s.id === p.studentId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-800">{p.receiptNo}</Td>
                    <Td>{st ? fullName(st) : "—"}</Td>
                    <Td>{formatDate(p.date)}</Td>
                    <Td><Badge tone="slate">{p.method.toUpperCase()}</Badge></Td>
                    <Td className="text-slate-500">{p.reference ?? "—"}</Td>
                    <Td className="font-bold text-emerald-600">{inr(p.amount)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Pick invoice to collect */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setPicking(false)} />
          <div className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-soft">
            <h3 className="text-lg font-bold text-slate-900">Select a pending invoice</h3>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student…" className="input pl-9" autoFocus />
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {pendingInvoices.map((inv) => {
                const st = data.students.find((s) => s.id === inv.studentId);
                return (
                  <button
                    key={inv.id}
                    onClick={() => { setPicking(false); setCollect(inv); }}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{st ? fullName(st) : "—"}</p>
                      <p className="text-xs text-slate-400">{inv.invoiceNo} · {inv.period}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-600">{inr(inv.total - inv.paid)}</span>
                  </button>
                );
              })}
              {pendingInvoices.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No pending invoices 🎉</p>}
            </div>
          </div>
        </div>
      )}

      {collect && <CollectModal invoice={collect} onClose={() => setCollect(null)} />}
    </div>
  );
}
