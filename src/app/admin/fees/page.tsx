"use client";

import Link from "next/link";
import { useData } from "@/lib/store";
import { Card, CardHeader, Stat, Badge, Avatar, Progress, EmptyState } from "@/components/ui";
import { TrendArea, Bars, Donut } from "@/components/charts";
import {
  collectionSummary, collectionTrend, feeByCategory, paymentMethodSplit, classHealth,
} from "@/lib/analytics";
import { inr, fullName, todayISO } from "@/lib/utils";
import { Wallet, TrendingUp, AlertTriangle, IndianRupee, ArrowRight, Receipt } from "lucide-react";

export default function AdminFinance() {
  const data = useData();
  const today = todayISO();
  const summary = collectionSummary(data.invoices);
  const trend = collectionTrend(data.payments, 14);
  const byCategory = feeByCategory(data.invoices).map((c) => ({ label: c.name, Amount: c.value }));
  const methods = paymentMethodSplit(data.payments);
  const health = classHealth(data.students, data.classes, data.attendance, data.invoices, today);

  const topDefaulters = data.invoices
    .filter((i) => i.status !== "paid")
    .map((i) => ({ inv: i, student: data.students.find((s) => s.id === i.studentId), due: i.total - i.paid }))
    .filter((d) => d.student && d.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Finance</h1>
          <p className="mt-1 text-sm text-slate-500">School-wide collection and cashflow.</p>
        </div>
        <Link href="/accountant" className="btn-ghost text-sm">Accounts portal <ArrowRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Collected" value={inr(summary.collected)} tone="green" icon={<Wallet className="h-5 w-5" />} trend={{ value: `${summary.rate}%`, up: true }} />
        <Stat label="Billed" value={inr(summary.billed)} tone="brand" icon={<IndianRupee className="h-5 w-5" />} />
        <Stat label="Outstanding" value={inr(summary.pending)} tone="amber" icon={<AlertTriangle className="h-5 w-5" />} />
        <Stat label="Overdue" value={inr(summary.overdue)} tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Collection Trend" subtitle="Last 14 days" icon={<TrendingUp className="h-5 w-5" />} />
          <div className="p-4"><TrendArea data={trend} dataKey="Collected" color="#10b981" /></div>
        </Card>
        <Card>
          <CardHeader title="Payment Methods" icon={<Receipt className="h-5 w-5" />} />
          <div className="p-4"><Donut data={methods} /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue by Fee Head" icon={<IndianRupee className="h-5 w-5" />} />
          <div className="p-4"><Bars data={byCategory} keys={["Amount"]} colors={["#8b5cf6"]} /></div>
        </Card>
        <Card>
          <CardHeader title="Class-wise Collection" icon={<Wallet className="h-5 w-5" />} />
          <div className="space-y-3.5 p-5">
            {health.map((h) => {
              const ids = new Set(data.students.filter((s) => s.classId === h.class.id).map((s) => s.id));
              const invs = data.invoices.filter((i) => ids.has(i.studentId));
              const billed = invs.reduce((s, i) => s + i.total, 0);
              const collected = invs.reduce((s, i) => s + i.paid, 0);
              const rate = billed ? Math.round((collected / billed) * 100) : 100;
              return (
                <div key={h.class.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{h.class.name}</span>
                    <span className="text-xs text-slate-500">{inr(collected)} / {inr(billed)}</span>
                  </div>
                  <Progress value={rate} tone={rate >= 80 ? "green" : rate >= 50 ? "amber" : "red"} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Top Defaulters" icon={<AlertTriangle className="h-5 w-5" />} action={<Link href="/accountant/reports" className="btn-soft text-xs">Full report <ArrowRight className="h-3.5 w-3.5" /></Link>} />
        <div className="divide-y divide-slate-100">
          {topDefaulters.length === 0 && <div className="p-5"><EmptyState title="All fees collected 🎉" /></div>}
          {topDefaulters.map(({ inv, student, due }) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={fullName(student!)} src={student!.photoUrl} size={34} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{fullName(student!)}</p>
                  <p className="text-xs text-slate-400">{inv.invoiceNo}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-rose-600">{inr(due)}</p>
                <Badge tone={inv.status === "overdue" ? "red" : "amber"}>{inv.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
