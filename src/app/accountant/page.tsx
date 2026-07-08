"use client";

import Link from "next/link";
import { useData } from "@/lib/store";
import { Card, CardHeader, Stat, Badge, Avatar, Progress, EmptyState } from "@/components/ui";
import { QuickActions } from "@/components/QuickActions";
import { TrendArea, Donut, Bars } from "@/components/charts";
import {
  collectionSummary, collectionTrend, feeByCategory, paymentMethodSplit,
} from "@/lib/analytics";
import { inr, fullName, formatDate } from "@/lib/utils";
import {
  Wallet, TrendingUp, AlertTriangle, Receipt, IndianRupee, ArrowRight, CircleSlash,
  Users, FileText, BadgePercent, BarChart3,
} from "lucide-react";

export default function AccountantDashboard() {
  const data = useData();
  const summary = collectionSummary(data.invoices);
  const trend = collectionTrend(data.payments, 14);
  const byCategory = feeByCategory(data.invoices);
  const methods = paymentMethodSplit(data.payments);

  const defaulters = data.invoices
    .filter((i) => i.status === "overdue" || i.status === "pending")
    .map((i) => ({ inv: i, student: data.students.find((s) => s.id === i.studentId), due: i.total - i.paid }))
    .filter((d) => d.student)
    .sort((a, b) => b.due - a.due)
    .slice(0, 6);

  const recent = data.payments.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Accounts Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Fee collection, dues and cashflow at a glance.</p>
      </div>

      <QuickActions
        actions={[
          { label: "Students", href: "/accountant/students", icon: Users, tone: "brand", hint: "Raise fees" },
          { label: "Invoices", href: "/accountant/invoices", icon: FileText, tone: "sky", hint: "View & collect" },
          { label: "Payments", href: "/accountant/payments", icon: Receipt, tone: "green", hint: "Receipts" },
          { label: "Fee Structure", href: "/accountant/fees", icon: Wallet, tone: "violet", hint: "Fee heads" },
          { label: "Concessions", href: "/accountant/concessions", icon: BadgePercent, tone: "amber", hint: "Discounts" },
          { label: "Pending Report", href: "/accountant/reports", icon: BarChart3, tone: "rose", hint: "Defaulters" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Collected" value={inr(summary.collected)} tone="green" icon={<Wallet className="h-5 w-5" />} trend={{ value: `${summary.rate}%`, up: true }} hint="of billed" />
        <Stat label="Outstanding" value={inr(summary.pending)} tone="amber" icon={<AlertTriangle className="h-5 w-5" />} hint="across all invoices" />
        <Stat label="Overdue" value={inr(summary.overdue)} tone="red" icon={<CircleSlash className="h-5 w-5" />} hint="needs follow-up" />
        <Stat label="Total Billed" value={inr(summary.billed)} tone="brand" icon={<IndianRupee className="h-5 w-5" />} hint={`${data.invoices.length} invoices`} />
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
          <div className="p-4"><Bars data={byCategory.map((c) => ({ label: c.name, Amount: c.value }))} keys={["Amount"]} /></div>
        </Card>

        <Card>
          <CardHeader
            title="Top Defaulters"
            subtitle="Highest outstanding dues"
            icon={<AlertTriangle className="h-5 w-5" />}
            action={<Link href="/accountant/reports" className="btn-soft text-xs">Full report <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="divide-y divide-slate-100">
            {defaulters.length === 0 && <div className="p-5"><EmptyState title="No dues — fully collected 🎉" /></div>}
            {defaulters.map(({ inv, student, due }) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={fullName(student!)} src={student!.photoUrl} size={36} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{fullName(student!)}</p>
                    <p className="text-xs text-slate-400">{inv.invoiceNo} · due {formatDate(inv.dueDate)}</p>
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

      <Card>
        <CardHeader title="Recent Receipts" icon={<Receipt className="h-5 w-5" />} action={<Link href="/accountant/payments" className="btn-soft text-xs">All payments <ArrowRight className="h-3.5 w-3.5" /></Link>} />
        <div className="divide-y divide-slate-100">
          {recent.map((p) => {
            const st = data.students.find((s) => s.id === p.studentId);
            return (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Receipt className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.receiptNo} · {st ? fullName(st) : "—"}</p>
                    <p className="text-xs text-slate-400">{formatDate(p.date)} · {p.method.toUpperCase()}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-emerald-600">{inr(p.amount)}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
