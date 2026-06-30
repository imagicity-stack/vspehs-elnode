"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { RaiseStudentFeeModal } from "../RaiseStudentFeeModal";
import { Card, Badge, Avatar, Table, Th, Td, Stat, EmptyState, Loading } from "@/components/ui";
import { inr, fullName } from "@/lib/utils";
import { Student } from "@/lib/types";
import { Users, Search, IndianRupee, Wallet, CalendarPlus } from "lucide-react";

export default function AccountantStudents() {
  const data = useData();
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("all");
  const [raiseFor, setRaiseFor] = useState<Student | null>(null);

  const dueFor = (studentId: string) =>
    data.invoices
      .filter((i) => i.studentId === studentId && i.status !== "paid")
      .reduce((s, i) => s + (i.total - i.paid), 0);

  const rows = data.students
    .filter((s) => classId === "all" || s.classId === classId)
    .filter((s) => !q || fullName(s).toLowerCase().includes(q.toLowerCase()) || s.admissionNo.includes(q))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  const totalOutstanding = data.invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.total - i.paid), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-500">Raise a fee request for an individual student.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Students" value={data.students.length} tone="brand" icon={<Users className="h-5 w-5" />} />
        <Stat label="Total Outstanding" value={inr(totalOutstanding)} tone="amber" icon={<Wallet className="h-5 w-5" />} />
        <Stat label="Fee Heads" value={data.feeHeads.length} tone="violet" icon={<IndianRupee className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input sm:w-48">
            <option value="all">All classes</option>
            {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student or admission no…" className="input pl-9 sm:w-72" />
          </div>
        </div>

        {data.loading && data.students.length === 0 ? (
          <Loading label="Loading students…" />
        ) : rows.length === 0 ? (
          <div className="p-8"><EmptyState icon={<Users className="h-8 w-8" />} title={data.students.length === 0 ? "No students yet" : "No students match"} /></div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Student</Th><Th>Admission</Th><Th>Class</Th><Th>Outstanding</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((s) => {
                const cls = data.classes.find((c) => c.id === s.classId);
                const due = dueFor(s.id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(s)} src={s.photoUrl} size={32} />
                        <span className="font-medium text-slate-800">{fullName(s)}</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-slate-500">{s.admissionNo}</Td>
                    <Td className="text-slate-600">{cls?.name ?? "—"}</Td>
                    <Td>
                      {due > 0
                        ? <Badge tone="amber">{inr(due)}</Badge>
                        : <span className="text-emerald-600">Clear</span>}
                    </Td>
                    <Td>
                      <button onClick={() => setRaiseFor(s)} className="btn-primary px-3 py-1.5 text-xs">
                        <CalendarPlus className="h-3.5 w-3.5" /> Raise Fee
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {raiseFor && <RaiseStudentFeeModal student={raiseFor} onClose={() => setRaiseFor(null)} />}
    </div>
  );
}
