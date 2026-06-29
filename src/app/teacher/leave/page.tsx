"use client";

import { useState } from "react";
import { useTeacher } from "../teacher-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { todayISO, formatDate } from "@/lib/utils";
import { LeaveRequest } from "@/lib/types";
import { CalendarOff, Send } from "lucide-react";

export default function TeacherLeave() {
  const { staff } = useTeacher();
  const data = useData();
  const [type, setType] = useState<LeaveRequest["type"]>("casual");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");

  const mine = data.leaveRequests
    .filter((l) => l.staffId === staff?.id)
    .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));

  const apply = () => {
    if (!from || !to || !reason.trim()) return;
    data.applyLeave({
      staffId: staff?.id ?? "s-anita", type, from, to, reason: reason.trim(),
      status: "pending", appliedOn: todayISO(),
    });
    setFrom(""); setTo(""); setReason("");
  };

  const balance = { casual: 8, sick: 6, earned: 12 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave</h1>
        <p className="mt-1 text-sm text-slate-500">Apply for leave and track approvals.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.entries(balance).map(([k, v]) => (
          <Card key={k} className="p-5">
            <p className="text-sm capitalize text-slate-500">{k} leave balance</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{v} <span className="text-base font-medium text-slate-400">days</span></p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Apply for Leave" icon={<CalendarOff className="h-5 w-5" />} />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as LeaveRequest["type"])} className="input capitalize">
                {(["casual", "sick", "earned", "unpaid"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Brief reason for leave" className="input resize-none" />
          </div>
          <div className="flex justify-end">
            <button onClick={apply} disabled={!from || !to || !reason.trim()} className="btn-primary"><Send className="h-4 w-4" /> Submit request</button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="My Requests" icon={<CalendarOff className="h-5 w-5" />} />
        <div className="divide-y divide-slate-100">
          {mine.length === 0 && <div className="p-5"><EmptyState title="No leave requests yet" /></div>}
          {mine.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold capitalize text-slate-800">{l.type} leave · {l.reason}</p>
                <p className="text-xs text-slate-400">{formatDate(l.from)} → {formatDate(l.to)} · applied {formatDate(l.appliedOn)}</p>
              </div>
              <Badge tone={l.status === "approved" ? "green" : l.status === "rejected" ? "red" : "amber"}>{l.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
