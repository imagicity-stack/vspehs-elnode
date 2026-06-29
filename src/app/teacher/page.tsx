"use client";

import Link from "next/link";
import { useTeacher, ClassSwitcher } from "./teacher-context";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, Stat, Badge, Progress, EmptyState } from "@/components/ui";
import { attendanceForDate } from "@/lib/analytics";
import { todayISO, formatDate } from "@/lib/utils";
import {
  Users, CalendarCheck, ClipboardCheck, Camera, BookOpen, CircleSlash, Clock,
  CheckCircle2, ArrowRight, Star,
} from "lucide-react";

export default function TeacherDashboard() {
  const { staff, activeClass } = useTeacher();
  const { user } = useAuth();
  const data = useData();
  const today = todayISO();

  if (!activeClass) return <EmptyState title="No class assigned." />;

  const classStudents = data.students.filter((s) => s.classId === activeClass.id);
  const classAtt = data.attendance.filter((a) => a.classId === activeClass.id);
  const todayAtt = attendanceForDate(classAtt, today);
  const marked = classAtt.some((a) => a.date === today);
  const myTasks = data.taskItems.filter((t) => t.staffId === staff?.id && t.date === today);
  const doneTasks = myTasks.filter((t) => t.done).length;
  const todayUpdate = data.dailyUpdates.find((u) => u.classId === activeClass.id && u.date === today);
  const myLeave = data.leaveRequests.filter((l) => l.staffId === staff?.id);
  const absentToday = classAtt.filter((a) => a.date === today && a.status === "absent");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Good day, {staff?.name.split(" ")[0]} 🌸
</h1>
          <p className="mt-1 text-sm text-slate-500">{formatDate(today, { weekday: "long", day: "numeric", month: "long" })} · {activeClass.name}</p>
        </div>
        <ClassSwitcher />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Class Strength" value={classStudents.length} tone="brand" icon={<Users className="h-5 w-5" />} hint={`Capacity ${activeClass.capacity}`} />
        <Stat label="Present Today" value={marked ? `${todayAtt.present + todayAtt.late}/${classStudents.length}` : "Not marked"} tone={marked ? "green" : "amber"} icon={<CalendarCheck className="h-5 w-5" />} hint={marked ? `${todayAtt.rate}% attendance` : "Mark now"} />
        <Stat label="Tasks Done" value={`${doneTasks}/${myTasks.length}`} tone="violet" icon={<ClipboardCheck className="h-5 w-5" />} hint="Today's checklist" />
        <Stat label="Daily Update" value={todayUpdate ? "Posted" : "Pending"} tone={todayUpdate ? "green" : "amber"} icon={<Camera className="h-5 w-5" />} hint="Class moments" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction href="/teacher/attendance" icon={<CalendarCheck className="h-5 w-5" />} title={marked ? "Edit Attendance" : "Mark Attendance"} tone="bg-emerald-500" />
        <QuickAction href="/teacher/updates" icon={<Camera className="h-5 w-5" />} title="Post Daily Update" tone="bg-violet-500" />
        <QuickAction href="/teacher/homework" icon={<BookOpen className="h-5 w-5" />} title="Add Homework" tone="bg-sky-500" />
        <QuickAction href="/teacher/exams" icon={<Star className="h-5 w-5" />} title="Enter Assessment" tone="bg-amber-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's attendance breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's Attendance"
            subtitle={marked ? `${todayAtt.rate}% present` : "Not marked yet"}
            icon={<CalendarCheck className="h-5 w-5" />}
            action={<Link href="/teacher/attendance" className="btn-soft text-xs">{marked ? "Edit" : "Mark"} <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="p-5">
            {marked ? (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600" />
                    <p className="mt-1 text-2xl font-bold text-emerald-700">{todayAtt.present}</p>
                    <p className="text-xs text-emerald-600">Present</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <Clock className="mx-auto h-5 w-5 text-amber-600" />
                    <p className="mt-1 text-2xl font-bold text-amber-700">{todayAtt.late}</p>
                    <p className="text-xs text-amber-600">Late</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4">
                    <CircleSlash className="mx-auto h-5 w-5 text-rose-600" />
                    <p className="mt-1 text-2xl font-bold text-rose-700">{todayAtt.absent}</p>
                    <p className="text-xs text-rose-600">Absent</p>
                  </div>
                </div>
                {absentToday.length > 0 && (
                  <div className="mt-4">
                    <p className="label">Absent — parents notified</p>
                    <div className="flex flex-wrap gap-2">
                      {absentToday.map((a) => {
                        const st = data.students.find((s) => s.id === a.studentId);
                        return <Badge key={a.id} tone="red">{st?.firstName} {st?.lastName}</Badge>;
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon={<CalendarCheck className="h-8 w-8" />} title="Attendance not marked" hint="Tap 'Mark Attendance' to begin." />
            )}
          </div>
        </Card>

        {/* Task checklist */}
        <Card>
          <CardHeader title="My Checklist" icon={<ClipboardCheck className="h-5 w-5" />} action={<Link href="/teacher/tasks" className="btn-soft text-xs">Open</Link>} />
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">{doneTasks} of {myTasks.length} done</span>
              <span className="font-semibold text-brand-600">{myTasks.length ? Math.round((doneTasks / myTasks.length) * 100) : 0}%</span>
            </div>
            <Progress value={myTasks.length ? (doneTasks / myTasks.length) * 100 : 0} />
            <div className="mt-4 space-y-2">
              {myTasks.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  {t.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                  <span className={t.done ? "text-slate-400 line-through" : "text-slate-700"}>{t.title}</span>
                </div>
              ))}
              {myTasks.length === 0 && <p className="text-sm text-slate-400">No tasks for today.</p>}
            </div>
          </div>
        </Card>
      </div>

      {/* Leave status */}
      {myLeave.length > 0 && (
        <Card>
          <CardHeader title="My Leave Requests" icon={<CalendarCheck className="h-5 w-5" />} action={<Link href="/teacher/leave" className="btn-soft text-xs">Manage</Link>} />
          <div className="divide-y divide-slate-100">
            {myLeave.slice(0, 3).map((l) => (
              <div key={l.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-slate-800">{l.type} leave · {l.reason}</p>
                  <p className="text-xs text-slate-400">{formatDate(l.from)} → {formatDate(l.to)}</p>
                </div>
                <Badge tone={l.status === "approved" ? "green" : l.status === "rejected" ? "red" : "amber"}>{l.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function QuickAction({ href, icon, title, tone }: { href: string; icon: React.ReactNode; title: string; tone: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone} text-white`}>{icon}</div>
      <span className="text-sm font-semibold text-slate-800">{title}</span>
      <ArrowRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
    </Link>
  );
}
