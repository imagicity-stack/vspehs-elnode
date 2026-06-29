"use client";

import { useData } from "@/lib/store";
import { Card, Badge, Avatar, Progress, Stat } from "@/components/ui";
import { attendanceForDate } from "@/lib/analytics";
import { fullName, todayISO } from "@/lib/utils";
import { School, Users, DoorOpen } from "lucide-react";

export default function AdminClasses() {
  const data = useData();
  const today = todayISO();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Classes</h1>
        <p className="mt-1 text-sm text-slate-500">Sections, rooms and class teachers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Classes" value={data.classes.length} tone="brand" icon={<School className="h-5 w-5" />} />
        <Stat label="Total Seats" value={data.classes.reduce((s, c) => s + c.capacity, 0)} tone="violet" icon={<DoorOpen className="h-5 w-5" />} />
        <Stat label="Enrolled" value={data.students.length} tone="green" icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.classes.map((c) => {
          const strength = data.students.filter((s) => s.classId === c.id).length;
          const teacher = data.staff.find((s) => s.id === c.classTeacherId);
          const helpers = data.staff.filter((s) => s.role === "helper" && s.assignedClassIds.includes(c.id));
          const att = attendanceForDate(data.attendance.filter((a) => a.classId === c.id), today);
          const occupancy = Math.round((strength / c.capacity) * 100);
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">{c.level[0]}</div>
                  <div>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.level} · Section {c.section}</p>
                  </div>
                </div>
                <Badge tone="slate">{c.room}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Occupancy</span>
                    <span className="font-semibold text-slate-700">{strength}/{c.capacity}</span>
                  </div>
                  <Progress value={occupancy} tone={occupancy > 90 ? "red" : "brand"} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Attendance today</span>
                  <span className="font-semibold text-emerald-600">{att.total ? `${att.rate}%` : "—"}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="label">Class Teacher</p>
                <div className="flex items-center gap-2">
                  <Avatar name={teacher?.name ?? "—"} src={teacher?.photoUrl} size={28} />
                  <span className="text-sm font-medium text-slate-700">{teacher?.name ?? "Unassigned"}</span>
                </div>
                {helpers.length > 0 && (
                  <p className="mt-2 text-xs text-slate-400">Support: {helpers.map((h) => h.name).join(", ")}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
