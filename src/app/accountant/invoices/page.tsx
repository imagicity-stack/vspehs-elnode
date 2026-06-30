"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Avatar, Table, Th, Td, EmptyState } from "@/components/ui";
import { CollectModal } from "../CollectModal";
import { RaiseFeesModal } from "../RaiseFeesModal";
import { inr, fullName, formatDate } from "@/lib/utils";
import { Invoice, InvoiceStatus } from "@/lib/types";
import { FileText, Search, CalendarPlus } from "lucide-react";

const statusTone: Record<InvoiceStatus, "green" | "amber" | "red" | "sky"> = {
  paid: "green", partial: "sky", pending: "amber", overdue: "red",
};
const filters: (InvoiceStatus | "all")[] = ["all", "pending", "overdue", "partial", "paid"];

export default function AccountantInvoices() {
  const data = useData();
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");
  const [q, setQ] = useState("");
  const [collect, setCollect] = useState<Invoice | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);

  const rows = data.invoices
    .filter((i) => filter === "all" || i.status === filter)
    .filter((i) => {
      if (!q) return true;
      const st = data.students.find((s) => s.id === i.studentId);
      return (st && fullName(st).toLowerCase().includes(q.toLowerCase())) || i.invoiceNo.toLowerCase().includes(q.toLowerCase());
    })
    .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">All fee invoices across the school.</p>
        </div>
        <button onClick={() => setRaiseOpen(true)} className="btn-primary shrink-0">
          <CalendarPlus className="h-4 w-4" /> Raise Monthly Fees
        </button>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === f ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student or invoice…" className="input pl-9 sm:w-64" />
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="p-5"><EmptyState icon={<FileText className="h-8 w-8" />} title="No invoices match" /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Student</Th><Th>Invoice</Th><Th>Period</Th><Th>Total</Th><Th>Paid</Th><Th>Due</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((inv) => {
                const st = data.students.find((s) => s.id === inv.studentId);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        {st && <Avatar name={fullName(st)} src={st.photoUrl} size={32} />}
                        <span className="font-medium text-slate-800">{st ? fullName(st) : "—"}</span>
                      </div>
                    </Td>
                    <Td className="text-slate-500">{inv.invoiceNo}</Td>
                    <Td>{inv.period}</Td>
                    <Td className="font-semibold">{inr(inv.total)}</Td>
                    <Td className="text-slate-500">{inr(inv.paid)}</Td>
                    <Td>{formatDate(inv.dueDate)}</Td>
                    <Td><Badge tone={statusTone[inv.status]}>{inv.status}</Badge></Td>
                    <Td>
                      {inv.status !== "paid" && (
                        <button onClick={() => setCollect(inv)} className="btn-primary px-3 py-1.5 text-xs">Collect</button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {collect && <CollectModal invoice={collect} onClose={() => setCollect(null)} />}
      {raiseOpen && <RaiseFeesModal onClose={() => setRaiseOpen(false)} />}
    </div>
  );
}
