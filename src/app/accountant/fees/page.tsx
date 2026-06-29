"use client";

import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Stat, Table, Th, Td } from "@/components/ui";
import { inr } from "@/lib/utils";
import { FeeCategory } from "@/lib/types";
import { Wallet, Bus, Palette, GraduationCap, Soup, FileText, IndianRupee } from "lucide-react";

const catIcon: Record<FeeCategory, any> = {
  tuition: GraduationCap, transport: Bus, activity: Palette, admission: FileText, exam: FileText, meal: Soup, other: Wallet,
};
const freqTone = (f: string) => (f === "monthly" ? "brand" : f === "quarterly" ? "violet" : f === "annual" ? "sky" : "slate") as any;

export default function AccountantFees() {
  const data = useData();
  const monthlyExpected = data.feeHeads.filter((f) => f.frequency === "monthly").reduce((s, f) => s + f.amount, 0) * data.students.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Structure</h1>
        <p className="mt-1 text-sm text-slate-500">Configured fee heads applied when generating invoices.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Fee Heads" value={data.feeHeads.length} tone="brand" icon={<Wallet className="h-5 w-5" />} />
        <Stat label="Est. Monthly Billing" value={inr(monthlyExpected)} tone="green" icon={<IndianRupee className="h-5 w-5" />} hint={`${data.students.length} students`} />
        <Stat label="Active Students" value={data.students.filter((s) => s.status === "active").length} tone="violet" icon={<GraduationCap className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.feeHeads.map((f) => {
          const Icon = catIcon[f.category];
          return (
            <Card key={f.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold text-slate-900">{f.name}</p>
                    <p className="text-xs capitalize text-slate-400">{f.category}</p>
                  </div>
                </div>
                <Badge tone={freqTone(f.frequency)}>{f.frequency}</Badge>
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-900">{inr(f.amount)}</p>
              <p className="mt-1 text-xs text-slate-400">
                Applies to {f.appliesTo === "all" ? "all classes" : `${(f.appliesTo as string[]).length} classes`}
              </p>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Fee Heads Summary" icon={<Wallet className="h-5 w-5" />} />
        <Table>
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Fee Head</Th><Th>Category</Th><Th>Frequency</Th><Th>Amount</Th><Th>Applies To</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.feeHeads.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">{f.name}</Td>
                <Td className="capitalize">{f.category}</Td>
                <Td><Badge tone={freqTone(f.frequency)}>{f.frequency}</Badge></Td>
                <Td className="font-semibold">{inr(f.amount)}</Td>
                <Td className="text-slate-500">{f.appliesTo === "all" ? "All classes" : `${(f.appliesTo as string[]).length} classes`}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
