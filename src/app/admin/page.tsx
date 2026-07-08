"use client";

import Link from "next/link";
import { useData } from "@/lib/store";
import { Card, CardHeader, Stat, Badge, Avatar, Progress, EmptyState } from "@/components/ui";
import { Bars, Donut, TrendArea } from "@/components/charts";
import {
  attendanceForDate, attendanceTrend, collectionSummary, enrolmentByLevel,
  genderSplit, classHealth, collectionTrend,
} from "@/lib/analytics";
import { inr, fullName, todayISO, formatDate } from "@/lib/utils";
import { SCHOOL_NAME } from "@/lib/branding";
import { QuickActions } from "@/components/QuickActions";
import {
  Users, GraduationCap, CalendarCheck, Wallet, ArrowRight, TrendingUp, School,
  Megaphone, CircleSlash, BookOpen, Receipt, BarChart3, Settings,
} from "lucide-react";

export default function AdminDashboard() {
  const data = useData();
  const today = todayISO();

  const todayAtt = attendanceForDate(data.attendance, today);
  const attTrend = attendanceTrend(data.attendance, 10);
  const summary = collectionSummary(data.invoices);
  const collTrend = collectionTrend(data.payments, 14);
  const enrol = enrolmentByLevel(data.students, data.classes);
  const gender = genderSplit(data.students);
  const health = classHealth(data.students, data.classes, data.attendance, data.invoices, today);
  const activeStaff = data.staff.filter((s) => s.status === "active").length;
  const pendingLeave = data.leaveRequests.filter((l) => l.status === "pending");
  const circulars = data.circulars.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">School Overview</h1>
        <p className="mt-1 text-sm text-slate-500">{formatDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {SCHOOL_NAME}</p>
      </div>

      <QuickActions
        actions={[
          { label: "Students", href: "/admin/students", icon: Users, tone: "brand", hint: `${data.students.length} enrolled` },
          { label: "Staff", href: "/admin/staff", icon: GraduationCap, tone: "violet", hint: `${activeStaff} active` },
          { label: "Classes", href: "/admin/classes", icon: School, tone: "sky", hint: `${data.classes.length} sections` },
          { label: "Subjects", href: "/admin/subjects", icon: BookOpen, tone: "green", hint: `${data.subjects.length} subjects` },
          { label: "Fee Heads", href: "/admin/fee-heads", icon: Receipt, tone: "amber", hint: `${data.feeHeads.length} heads` },
          { label: "Finance", href: "/admin/fees", icon: Wallet, tone: "green", hint: "Collection" },
          { label: "Analytics", href: "/admin/analytics", icon: BarChart3, tone: "brand", hint: "Reports" },
          { label: "Settings", href: "/admin/settings", icon: Settings, tone: "slate", hint: "Configuration" },
        ]}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Students" value={data.students.length} tone="brand" icon={<Users className="h-5 w-5" />} hint={`${data.classes.length} classes`} />
        <Stat label="Attendance Today" value={`${todayAtt.rate}%`} tone="green" icon={<CalendarCheck className="h-5 w-5" />} hint={`${todayAtt.present + todayAtt.late}/${todayAtt.total} present`} />
        <Stat label="Collection Rate" value={`${summary.rate}%`} tone="violet" icon={<Wallet className="h-5 w-5" />} trend={{ value: inr(summary.collected), up: true }} />
        <Stat label="Active Staff" value={activeStaff} tone="amber" icon={<GraduationCap className="h-5 w-5" />} hint={`${pendingLeave.length} leave pending`} />
      </div>

      {/* Attendance + collection trends */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance Trend" subtitle="Present / Late / Absent — last 10 days" icon={<CalendarCheck className="h-5 w-5" />} />
          <div className="p-4"><Bars data={attTrend} keys={["Present", "Late", "Absent"]} colors={["#10b981", "#f59e0b", "#ef4444"]} stacked /></div>
        </Card>
        <Card>
          <CardHeader title="Enrolment by Level" icon={<School className="h-5 w-5" />} />
          <div className="p-4"><Bars data={enrol} keys={["Students"]} colors={["#1d40f5"]} height={220} /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Fee Collection" subtitle="Last 14 days" icon={<TrendingUp className="h-5 w-5" />} />
          <div className="p-4"><TrendArea data={collTrend} dataKey="Collected" color="#8b5cf6" /></div>
        </Card>
        <Card>
          <CardHeader title="Gender Split" icon={<Users className="h-5 w-5" />} />
          <div className="p-4"><Donut data={gender} /></div>
        </Card>
      </div>

      {/* Class health */}
      <Card>
        <CardHeader
          title="Class Health"
          subtitle="Strength, attendance & dues by class"
          icon={<School className="h-5 w-5" />}
          action={<Link href="/admin/analytics" className="btn-soft text-xs">Deep dive <ArrowRight className="h-3.5 w-3.5" /></Link>}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {health.map((h) => {
            const teacher = data.staff.find((s) => s.id === h.class.classTeacherId);
            return (
              <div key={h.class.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{h.class.name}</p>
                  <Badge tone="slate">{h.strength}/{h.capacity}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{teacher?.name}</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Attendance</span>
                    <span className="font-semibold text-slate-700">{h.attendanceRate}%</span>
                  </div>
                  <Progress value={h.attendanceRate} tone={h.attendanceRate >= 80 ? "green" : "amber"} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Dues</span>
                    <span className={`font-semibold ${h.dues > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inr(h.dues)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Leave approvals + circulars */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pending Leave Approvals" icon={<CalendarCheck className="h-5 w-5" />} action={<Link href="/admin/staff" className="btn-soft text-xs">Manage</Link>} />
          <div className="divide-y divide-slate-100">
            {pendingLeave.length === 0 && <div className="p-5"><EmptyState title="No pending approvals" /></div>}
            {pendingLeave.map((l) => {
              const member = data.staff.find((s) => s.id === l.staffId);
              return (
                <div key={l.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={member?.name ?? "Staff"} size={36} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{member?.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{l.type} · {formatDate(l.from)}→{formatDate(l.to)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => data.setLeaveStatus(l.id, "approved")} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
                    <button onClick={() => data.setLeaveStatus(l.id, "rejected")} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent Circulars" icon={<Megaphone className="h-5 w-5" />} action={<Link href="/admin/circulars" className="btn-soft text-xs">Post</Link>} />
          <div className="divide-y divide-slate-100">
            {circulars.map((c) => (
              <div key={c.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                  <Badge tone={c.category === "alert" ? "red" : c.category === "event" ? "violet" : "slate"}>{c.category}</Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{c.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
