"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, Badge, Avatar, Table, Th, Td, EmptyState } from "@/components/ui";
import { inr, fullName, formatDate } from "@/lib/utils";
import { Concession } from "@/lib/types";
import { BadgePercent, Plus, X } from "lucide-react";

export default function AccountantConcessions() {
  const data = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? "");
  const [reason, setReason] = useState<Concession["reason"]>("sibling");
  const [type, setType] = useState<Concession["type"]>("percent");
  const [value, setValue] = useState(10);
  const [note, setNote] = useState("");

  const add = () => {
    data.addConcession({
      studentId, reason, type, value, note: note.trim() || undefined,
      approvedBy: user?.staffId ?? "s-admin",
      validTill: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
    });
    setOpen(false); setNote(""); setValue(10);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Concessions</h1>
          <p className="mt-1 text-sm text-slate-500">Discounts, scholarships and financial aid.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Concession</button>
      </div>

      <Card>
        <CardHeader title="Active Concessions" icon={<BadgePercent className="h-5 w-5" />} />
        {data.concessions.length === 0 ? (
          <div className="p-5"><EmptyState title="No concessions yet" /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Student</Th><Th>Reason</Th><Th>Discount</Th><Th>Note</Th><Th>Valid Till</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.concessions.map((c) => {
                const st = data.students.find((s) => s.id === c.studentId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        {st && <Avatar name={fullName(st)} src={st.photoUrl} size={32} />}
                        <span className="font-medium text-slate-800">{st ? fullName(st) : "—"}</span>
                      </div>
                    </Td>
                    <Td><Badge tone="violet">{c.reason.replace("-", " ")}</Badge></Td>
                    <Td className="font-semibold text-emerald-600">{c.type === "percent" ? `${c.value}%` : inr(c.value)}</Td>
                    <Td className="text-slate-500">{c.note ?? "—"}</Td>
                    <Td>{formatDate(c.validTill)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-bold text-slate-900">New Concession</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Student</label>
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input">
                  {data.students.map((s) => <option key={s.id} value={s.id}>{fullName(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value as Concession["reason"])} className="input capitalize">
                  {(["sibling", "staff-ward", "scholarship", "financial-aid", "other"] as const).map((r) => <option key={r} value={r}>{r.replace("-", " ")}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value as Concession["type"])} className="input">
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Value</label>
                  <input type="number" value={value} min={1} onChange={(e) => setValue(Number(e.target.value))} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="e.g. Second child concession" />
              </div>
            </div>
            <button onClick={add} className="btn-primary mt-5 w-full py-3">Save concession</button>
          </div>
        </div>
      )}
    </div>
  );
}
