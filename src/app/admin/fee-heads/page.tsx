"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { FeeHead, FeeCategory, FeeFrequency } from "@/lib/types";
import { Card, Table, Th, Td, Badge, Stat, EmptyState, Loading } from "@/components/ui";
import { inr } from "@/lib/utils";
import { Receipt, Plus, Edit2, Trash2, X, Loader2, IndianRupee, Layers } from "lucide-react";

const CATEGORIES: FeeCategory[] = ["tuition", "transport", "activity", "admission", "exam", "meal", "other"];
const FREQUENCIES: FeeFrequency[] = ["monthly", "quarterly", "annual", "one-time"];
const freqTone = (f: string) => (f === "monthly" ? "brand" : f === "quarterly" ? "violet" : f === "annual" ? "sky" : "slate") as "brand" | "violet" | "sky" | "slate";

export default function AdminFeeHeads() {
  const data = useData();
  const [addOpen, setAddOpen] = useState(false);
  const [editHead, setEditHead] = useState<FeeHead | null>(null);

  const monthlyTotal = data.feeHeads.filter((f) => f.frequency === "monthly").reduce((s, f) => s + f.amount, 0);

  const handleDelete = (f: FeeHead) => {
    if (!confirm(`Delete fee head "${f.name}"? Existing invoices are not affected.`)) return;
    data.deleteFeeHead(f.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Heads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Master fee structure. These are used by the accountant when raising fee requests.
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Fee Head
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Fee Heads" value={data.feeHeads.length} tone="brand" icon={<Receipt className="h-5 w-5" />} />
        <Stat label="Monthly per student" value={inr(monthlyTotal)} tone="green" icon={<IndianRupee className="h-5 w-5" />} hint="sum of monthly heads" />
        <Stat label="Categories" value={new Set(data.feeHeads.map((f) => f.category)).size} tone="violet" icon={<Layers className="h-5 w-5" />} />
      </div>

      <Card>
        {data.loading && data.feeHeads.length === 0 ? (
          <Loading label="Loading fee heads…" />
        ) : data.feeHeads.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title="No fee heads yet"
              hint='Add your first fee head — e.g. "Tuition Fee", monthly, ₹2,500.'
            />
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Fee Head</Th><Th>Category</Th><Th>Frequency</Th><Th>Amount</Th><Th>Applies To</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.feeHeads.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <Td className="font-semibold text-slate-800">{f.name}</Td>
                  <Td className="capitalize text-slate-600">{f.category}</Td>
                  <Td><Badge tone={freqTone(f.frequency)}>{f.frequency}</Badge></Td>
                  <Td className="font-semibold">{inr(f.amount)}</Td>
                  <Td className="text-slate-500">
                    {f.appliesTo === "all"
                      ? "All classes"
                      : data.classes.filter((c) => (f.appliesTo as string[]).includes(c.id)).map((c) => c.name).join(", ") || "—"}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditHead(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {(addOpen || editHead) && (
        <FeeHeadModal head={editHead ?? undefined} onClose={() => { setAddOpen(false); setEditHead(null); }} />
      )}
    </div>
  );
}

function FeeHeadModal({ head, onClose }: { head?: FeeHead; onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState({
    name: head?.name ?? "",
    category: head?.category ?? ("tuition" as FeeCategory),
    frequency: head?.frequency ?? ("monthly" as FeeFrequency),
    amount: String(head?.amount ?? ""),
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [scope, setScope] = useState<"all" | "specific">(head?.appliesTo === "all" || !head ? "all" : "specific");
  const [classIds, setClassIds] = useState<string[]>(Array.isArray(head?.appliesTo) ? (head!.appliesTo as string[]) : []);
  const [busy, setBusy] = useState(false);

  const amount = Number(form.amount);
  const valid = form.name.trim() && amount > 0 && (scope === "all" || classIds.length > 0);

  const toggleClass = (id: string) =>
    setClassIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = () => {
    if (!valid) return;
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      frequency: form.frequency,
      amount,
      appliesTo: scope === "all" ? ("all" as const) : classIds,
    };
    if (head) data.updateFeeHead(head.id, payload);
    else data.addFeeHead(payload);
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">{head ? "Edit Fee Head" : "Add Fee Head"}</h3>
        <p className="text-sm text-slate-500">Part of the master fee structure used across the school.</p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="label">Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tuition Fee" className="input" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className="input capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Frequency</label>
              <select value={form.frequency} onChange={(e) => set("frequency", e.target.value)} className="input capitalize">
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Amount (₹)</label>
            <input type="number" min={1} value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="2500" className="input" />
          </div>
          <div>
            <label className="label">Applies to</label>
            <div className="flex gap-2">
              {(["all", "specific"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize ${scope === s ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"}`}
                >
                  {s === "all" ? "All classes" : "Specific classes"}
                </button>
              ))}
            </div>
            {scope === "specific" && (
              <div className="mt-2 grid max-h-36 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {data.classes.length === 0 && <p className="col-span-2 p-2 text-xs text-slate-400">No classes yet.</p>}
                {data.classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={classIds.includes(c.id)} onChange={() => toggleClass(c.id)} className="h-3.5 w-3.5 accent-brand-600" />
                    <span className="text-slate-700">{c.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={!valid || busy} className="btn-primary flex-1 py-2.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : head ? "Save Changes" : "Add Fee Head"}
          </button>
        </div>
      </div>
    </div>
  );
}
