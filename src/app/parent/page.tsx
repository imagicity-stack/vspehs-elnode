"use client";

import Link from "next/link";
import { useChild, ChildSwitcher } from "./child-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Stat, Progress, EmptyState } from "@/components/ui";
import { Photo } from "@/components/Photo";
import { studentAttendanceRate } from "@/lib/analytics";
import { inr, fullName, formatDate, relativeDay } from "@/lib/utils";
import {
  CalendarCheck, Wallet, Smile, BookOpen, Megaphone, CalendarDays, Soup, Moon,
  ArrowRight, Camera,
} from "lucide-react";

const moodEmoji: Record<string, string> = { happy: "😊", okay: "🙂", tired: "😴", unwell: "🤒" };

export default function ParentDashboard() {
  const { child } = useChild();
  const data = useData();
  if (!child) return <EmptyState title="No child linked to this account." />;

  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = data.attendance.find((a) => a.studentId === child.id && a.date === today);
  const att = studentAttendanceRate(data.attendance, child.id);
  const update = data.dailyUpdates.find((u) => u.classId === child.classId);
  const dues = data.invoices
    .filter((i) => i.studentId === child.id && i.status !== "paid")
    .reduce((s, i) => s + (i.total - i.paid), 0);
  const hw = data.homework.filter((h) => h.classId === child.classId).slice(0, 3);
  const circulars = data.circulars
    .filter((c) => c.audience === "all" || c.audience === "parents")
    .slice(0, 3);
  const upcoming = data.events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hello! Here&apos;s {child.firstName}&apos;s day 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">{formatDate(today, { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <ChildSwitcher />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Today's Attendance"
          value={todayAtt ? (todayAtt.status === "present" ? "Present" : todayAtt.status === "late" ? "Late" : todayAtt.status === "absent" ? "Absent" : "Half day") : "—"}
          tone={todayAtt?.status === "absent" ? "red" : todayAtt?.status === "late" ? "amber" : "green"}
          icon={<CalendarCheck className="h-5 w-5" />}
          hint={todayAtt?.lateBy ? `${todayAtt.lateBy} min late` : "Marked by class teacher"}
        />
        <Stat label="Attendance Rate" value={`${att.rate}%`} tone="brand" icon={<CalendarCheck className="h-5 w-5" />} hint={`${att.present}/${att.total} school days`} />
        <Stat label="Fee Dues" value={inr(dues)} tone={dues > 0 ? "amber" : "green"} icon={<Wallet className="h-5 w-5" />} hint={dues > 0 ? "Tap Fees to pay" : "All clear 🎉"} />
        <Stat label="Mood Today" value={update ? `${moodEmoji[update.mood]} ${update.mood}` : "—"} tone="violet" icon={<Smile className="h-5 w-5" />} hint="From class teacher" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily update */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's Daily Update"
            subtitle={update ? formatDate(update.date) : "Not posted yet"}
            icon={<Camera className="h-5 w-5" />}
            action={<Link href="/parent/updates" className="btn-soft text-xs">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          {update ? (
            <div className="p-5">
              <p className="text-slate-700">{update.note}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 font-medium text-slate-600"><Smile className="h-4 w-4 text-violet-500" /> {moodEmoji[update.mood]} {update.mood}</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 font-medium text-slate-600"><Soup className="h-4 w-4 text-amber-500" /> Ate {update.ate}</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 font-medium text-slate-600"><Moon className="h-4 w-4 text-sky-500" /> {update.nap}</span>
              </div>
              {update.photoUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {update.photoUrls.map((p, i) => (
                    <Photo key={i} id={`${update.id}-${p}-${i}`} className="aspect-square" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5"><EmptyState title="No update yet today" hint="Your teacher usually posts by mid-day." /></div>
          )}
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader title="Upcoming" icon={<CalendarDays className="h-5 w-5" />} />
          <div className="divide-y divide-slate-100">
            {upcoming.length === 0 && <div className="p-5"><EmptyState title="Nothing scheduled" /></div>}
            {upcoming.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <span className="text-sm font-bold leading-none">{new Date(e.date).getDate()}</span>
                  <span className="text-[10px] uppercase">{new Date(e.date).toLocaleString("en", { month: "short" })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{e.title}</p>
                  <p className="text-xs text-slate-400">{relativeDay(e.date)}</p>
                </div>
                <Badge tone={e.type === "holiday" ? "green" : e.type === "exam" ? "amber" : "brand"}>{e.type}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Homework */}
        <Card>
          <CardHeader
            title="Homework & Activities"
            icon={<BookOpen className="h-5 w-5" />}
            action={<Link href="/parent/homework" className="btn-soft text-xs">All <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="divide-y divide-slate-100">
            {hw.length === 0 && <div className="p-5"><EmptyState title="No homework 🎉" /></div>}
            {hw.map((h) => (
              <div key={h.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{h.title}</p>
                  <Badge tone="sky">{h.subject}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{h.description}</p>
                {h.dueDate && <p className="mt-1 text-xs font-medium text-amber-600">Due {relativeDay(h.dueDate)}</p>}
              </div>
            ))}
          </div>
        </Card>

        {/* Circulars */}
        <Card>
          <CardHeader
            title="Notices & Circulars"
            icon={<Megaphone className="h-5 w-5" />}
            action={<Link href="/parent/circulars" className="btn-soft text-xs">All <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="divide-y divide-slate-100">
            {circulars.map((c) => (
              <div key={c.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{c.title}</p>
                  <Badge tone={c.category === "alert" ? "red" : c.category === "event" ? "violet" : "slate"}>{c.category}</Badge>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{c.body}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(c.date)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
