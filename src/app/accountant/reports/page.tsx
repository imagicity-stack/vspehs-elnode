"use client";

import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Avatar, Table, Th, Td, Stat, Progress, EmptyState } from "@/components/ui";
import { collectionSummary } from "@/lib/analytics";
import { inr, fullName, formatDate } from "@/lib/utils";
import { BarChart3, Printer, AlertTriangle, Wallet } from "lucide-react";

export default function PendingReport() {
  const data = useData();
  const summary = collectionSummary(data.invoices);

  // class-wise dues
  const byClass = data.classes.map((c) => {
    const ids = new Set(data.students.filter((s) => s.classId === c.id).map((s) => s.id));
    const invs = data.invoices.filter((i) => ids.has(i.studentId));
    const billed = invs.reduce((s, i) => s + i.total, 0);
    const collected = invs.reduce((s, i) => s + i.paid, 0);
    const due = billed - collected;
    return { cls: c, billed, collected, due, rate: billed ? Math.round((collected / billed) * 100) : 100 };
  });

  const defaulters = data.invoices
    .filter((i) => i.status !== "paid")
    .map((i) => ({ inv: i, student: data.students.find((s) => s.id === i.studentId), due: i.total - i.paid }))
    .filter((d) => d.student && d.due > 0)
    .sort((a, b) => b.due - a.due);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pending Fee Report</h1>
          <p className="mt-1 text-sm text-slate-500">Outstanding dues by class and student.</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary"><Printer className="h-4 w-4" /> Print / Export</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Collection Rate" value={`${summary.rate}%`} tone="green" icon={<BarChart3 className="h-5 w-5" />} />
        <Stat label="Outstanding" value={inr(summary.pending)} tone="amber" icon={<Wallet className="h-5 w-5" />} />
        <Stat label="Overdue" value={inr(summary.overdue)} tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
        <Stat label="Defaulters" value={defaulters.length} tone="violet" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader title="Class-wise Collection" icon={<BarChart3 className="h-5 w-5" />} />
        <div className="space-y-4 p-5">
          {byClass.map(({ cls, billed, collected, due, rate }) => (
            <div key={cls.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">{cls.name}</span>
                <span className="text-slate-500">{inr(collected)} / {inr(billed)} · <span className={due > 0 ? "text-rose-600 font-semibold" : "text-emerald-600"}>{inr(due)} due</span></span>
              </div>
              <Progress value={rate} tone={rate >= 80 ? "green" : rate >= 50 ? "amber" : "red"} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Defaulter List" subtitle={`${defaulters.length} students with pending dues`} icon={<AlertTriangle className="h-5 w-5" />} />
        {defaulters.length === 0 ? (
          <div className="p-5"><EmptyState title="No pending dues 🎉" /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Student</Th><Th>Class</Th><Th>Invoice</Th><Th>Due Date</Th><Th>Outstanding</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {defaulters.map(({ inv, student, due }) => {
                const cls = data.classes.find((c) => c.id === student!.classId);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(student!)} src={student!.photoUrl} size={32} />
                        <div>
                          <p className="font-medium text-slate-800">{fullName(student!)}</p>
                          <p className="text-xs text-slate-400">{student!.primaryContact}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>{cls?.name}</Td>
                    <Td className="text-slate-500">{inv.invoiceNo}</Td>
                    <Td>{formatDate(inv.dueDate)}</Td>
                    <Td className="font-bold text-rose-600">{inr(due)}</Td>
                    <Td><Badge tone={inv.status === "overdue" ? "red" : "amber"}>{inv.status}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
