"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTeacher, ClassSwitcher } from "./teacher-context";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, Stat, Badge, Progress, EmptyState, Avatar } from "@/components/ui";
import { QuickActions } from "@/components/QuickActions";
import { attendanceForDate } from "@/lib/analytics";
import { todayISO, formatDate, formatTime } from "@/lib/utils";
import {
  SHEET_STATUS_META, canMark, isClassPublished, isSheetLocked, sheetFor, sheetProgress,
  teacherScope,
} from "@/lib/exams";
import {
  Users, CalendarCheck, ClipboardCheck, Camera, BookOpen, CircleSlash, Clock,
  CheckCircle2, ArrowRight, Star, Pencil, Award, ClipboardList, Megaphone, ShieldCheck,
  TrendingUp, School,
} from "lucide-react";

export default function TeacherDashboard() {
  const { staff, activeClass } = useTeacher();
  const { user } = useAuth();
  const data = useData();
  const today = todayISO();

  const classStudents = activeClass ? data.students.filter((s) => s.classId === activeClass.id) : [];
  const classAtt = activeClass ? data.attendance.filter((a) => a.classId === activeClass.id) : [];
  const todayAtt = attendanceForDate(classAtt, today);
  const marked = classAtt.some((a) => a.date === today);
  const myTasks = data.taskItems.filter((t) => t.staffId === staff?.id && t.date === today);
  const doneTasks = myTasks.filter((t) => t.done).length;
  const todayUpdate = activeClass
    ? data.dailyUpdates.find((u) => u.classId === activeClass.id && u.date === today)
    : undefined;
  const myLeave = data.leaveRequests.filter((l) => l.staffId === staff?.id);
  const absentToday = classAtt.filter((a) => a.date === today && a.status === "absent");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Good day, {staff?.name.split(" ")[0] ?? "there"} 🌸
</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(today, { weekday: "long", day: "numeric", month: "long" })}
            {activeClass ? ` · ${activeClass.name}` : ""}
          </p>
        </div>
        {activeClass && <ClassSwitcher />}
      </div>

      <ExaminationPanel />

      {!activeClass ? (
        <Card className="p-8">
          <EmptyState
            icon={<School className="h-8 w-8" />}
            title="No class assigned"
            hint="Attendance, updates and homework unlock once an administrator allocates you a class."
          />
        </Card>
      ) : (
      <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Class Strength" value={classStudents.length} tone="brand" icon={<Users className="h-5 w-5" />} hint={`Capacity ${activeClass.capacity}`} />
        <Stat label="Present Today" value={marked ? `${todayAtt.present + todayAtt.late}/${classStudents.length}` : "Not marked"} tone={marked ? "green" : "amber"} icon={<CalendarCheck className="h-5 w-5" />} hint={marked ? `${todayAtt.rate}% attendance` : "Mark now"} />
        <Stat label="Tasks Done" value={`${doneTasks}/${myTasks.length}`} tone="violet" icon={<ClipboardCheck className="h-5 w-5" />} hint="Today's checklist" />
        <Stat label="Daily Update" value={todayUpdate ? "Posted" : "Pending"} tone={todayUpdate ? "green" : "amber"} icon={<Camera className="h-5 w-5" />} hint="Class moments" />
      </div>

      <QuickActions
        actions={[
          { label: marked ? "Edit Attendance" : "Mark Attendance", href: "/teacher/attendance", icon: CalendarCheck, tone: "green", hint: marked ? `${todayAtt.rate}% present` : "Not marked" },
          { label: "Marks Entry", href: "/teacher/marks", icon: Pencil, tone: "brand", hint: "Examination marks" },
          { label: "Daily Update", href: "/teacher/updates", icon: Camera, tone: "violet", hint: todayUpdate ? "Posted" : "Post now" },
          { label: "Homework", href: "/teacher/homework", icon: BookOpen, tone: "sky", hint: "Add assignment" },
          { label: "Assessment", href: "/teacher/exams", icon: Star, tone: "amber", hint: "Enter grades" },
          { label: "Tasks", href: "/teacher/tasks", icon: ClipboardCheck, tone: "slate", hint: `${doneTasks}/${myTasks.length} done` },
        ]}
      />

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
      </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Examination snapshot — allocation, upcoming papers, marks status
// ─────────────────────────────────────────────────────────────
function ExaminationPanel() {
  const { user } = useAuth();
  const data = useData();
  const today = todayISO();

  const me = data.staff.find((s) => s.id === user?.staffId);
  const scope = useMemo(
    () => teacherScope(me?.id ?? "", data.teacherAssignments),
    [me?.id, data.teacherAssignments],
  );

  const myPapers = useMemo(() => {
    if (!me) return [];
    return data.subjectExams
      .filter((e) => canMark(e, me.id, scope))
      .filter((e) => {
        const g = data.examGroups.find((x) => x.id === e.groupId);
        return g && g.status !== "draft" && g.status !== "archived";
      });
  }, [me, data.subjectExams, data.examGroups, scope]);

  const upcoming = myPapers
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const pending = myPapers.filter((e) => e.date <= today && !isSheetLocked(sheetFor(e.id, data.examMarks)));
  const completed = myPapers.filter((e) => isSheetLocked(sheetFor(e.id, data.examMarks)));
  const publishedRecently = myPapers.filter((e) =>
    isClassPublished(data.examGroups.find((g) => g.id === e.groupId), e.classId),
  );

  // Examination notices addressed to all teachers or to this one.
  const notices = data.notifications
    .filter((n) => (n.audience === "teachers" || n.audience === "all")
      && (!n.staffIds?.length || (me ? n.staffIds.includes(me.id) : false)))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 3);

  if (!me) return null;

  const classTeacherOf = data.classes.filter((c) => c.classTeacherId === me.id);
  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? id;
  const className = (id: string) => data.classes.find((c) => c.id === id)?.name ?? id;

  // Nothing to show before any examination touches this teacher.
  if (scope.pairs.length === 0 && myPapers.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Allocation strip */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={me.name} src={me.photoUrl} size={44} />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{me.name}</p>
              <p className="text-xs text-slate-400">
                {me.staffCode} · {me.designation || me.role}
                {me.department ? ` · ${me.department}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {classTeacherOf.map((c) => (
              <Badge key={c.id} tone="violet"><ShieldCheck className="h-3 w-3" /> Class teacher · {c.name}</Badge>
            ))}
            {scope.classIds.length === 0 ? (
              <Badge tone="red">No classes allocated</Badge>
            ) : (
              scope.classIds.map((cid) => (
                <Badge key={cid} tone="brand">
                  {className(cid)} · {scope.pairs.filter((p) => p.classId === cid).map((p) => subjectName(p.subjectId)).join(", ")}
                </Badge>
              ))
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Upcoming papers" value={upcoming.length} tone="sky" icon={<ClipboardList className="h-5 w-5" />} hint="Allocated to you" />
        <Stat label="Marks pending" value={pending.length} tone={pending.length ? "amber" : "slate"} icon={<Pencil className="h-5 w-5" />} hint="Sat but not submitted" />
        <Stat label="Marks submitted" value={completed.length} tone="green" icon={<CheckCircle2 className="h-5 w-5" />} hint="Locked" />
        <Stat label="Results published" value={publishedRecently.length} tone="violet" icon={<Award className="h-5 w-5" />} hint="Analytics available" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Upcoming examinations"
            icon={<ClipboardList className="h-5 w-5" />}
            action={<Link href="/teacher/marks" className="btn-soft text-xs">Marks entry <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="divide-y divide-slate-50">
            {upcoming.length === 0 ? (
              <div className="p-5"><EmptyState title="No upcoming papers" /></div>
            ) : (
              upcoming.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {subjectName(e.subjectId)} <span className="font-normal text-slate-400">· {className(e.classId)}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(e.date)} · {formatTime(e.startTime)} · {e.maxMarks} marks
                    </p>
                  </div>
                  <Badge tone="sky">{e.date === today ? "Today" : formatDate(e.date, { day: "numeric", month: "short" })}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={pending.length ? "Marks entry pending" : "Marks entry"}
            subtitle={pending.length ? "These papers are waiting on you" : "Nothing outstanding"}
            icon={<Pencil className="h-5 w-5" />}
            action={<Link href="/teacher/analytics" className="btn-soft text-xs"><TrendingUp className="h-3.5 w-3.5" /> Analytics</Link>}
          />
          <div className="divide-y divide-slate-50">
            {pending.length === 0 ? (
              <div className="p-5">
                <EmptyState title="All caught up" hint="Every paper you've sat has been submitted." />
              </div>
            ) : (
              pending.slice(0, 5).map((e) => {
                const students = data.students.filter((s) => s.classId === e.classId && s.status === "active");
                const prog = sheetProgress(sheetFor(e.id, data.examMarks), students.length);
                const meta = SHEET_STATUS_META[prog.status];
                const overdue = e.marksDeadline && e.marksDeadline < today;
                return (
                  <Link key={e.id} href="/teacher/marks" className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {subjectName(e.subjectId)} <span className="font-normal text-slate-400">· {className(e.classId)}</span>
                      </p>
                      <p className="flex items-center gap-1 text-xs text-slate-400">
                        {prog.entered}/{prog.total} entered
                        {e.marksDeadline && (
                          <>
                            <Clock className="ml-1 h-3 w-3" />
                            <span className={overdue ? "font-semibold text-rose-600" : ""}>
                              {overdue ? "overdue" : `due ${formatDate(e.marksDeadline)}`}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16"><Progress value={prog.percent} tone={prog.complete ? "green" : "amber"} /></div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {notices.length > 0 && (
        <Card>
          <CardHeader title="Examination notices" icon={<Megaphone className="h-5 w-5" />} />
          <div className="divide-y divide-slate-50">
            {notices.map((n) => (
              <div key={n.id} className="px-5 py-3">
                <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-500">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(n.at)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

