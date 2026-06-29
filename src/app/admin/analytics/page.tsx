"use client";

import { useData } from "@/lib/store";
import { Card, CardHeader, Stat } from "@/components/ui";
import { Bars, Donut, Trends, TrendArea } from "@/components/charts";
import {
  attendanceTrend, collectionSummary, feeByCategory, paymentMethodSplit,
  enrolmentByLevel, genderSplit, classHealth, collectionTrend, attendanceForDate,
} from "@/lib/analytics";
import { inr, todayISO } from "@/lib/utils";
import {
  BarChart3, CalendarCheck, Wallet, TrendingUp, Users, PieChart, Activity,
} from "lucide-react";

export default function AdminAnalytics() {
  const data = useData();
  const today = todayISO();
  const attTrend = attendanceTrend(data.attendance, 10).map((d) => ({ label: d.label, Rate: d.rate }));
  const summary = collectionSummary(data.invoices);
  const byCategory = feeByCategory(data.invoices).map((c) => ({ label: c.name, Amount: c.value }));
  const methods = paymentMethodSplit(data.payments);
  const enrol = enrolmentByLevel(data.students, data.classes);
  const gender = genderSplit(data.students);
  const health = classHealth(data.students, data.classes, data.attendance, data.invoices, today);
  const collTrend = collectionTrend(data.payments, 14);

  const classAttendance = health.map((h) => ({ label: h.class.name, Attendance: h.attendanceRate }));
  const occupancy = Math.round(
    (data.students.length / data.classes.reduce((s, c) => s + c.capacity, 0)) * 100,
  );
  const avgAttendance = Math.round(attTrend.reduce((s, d) => s + d.Rate, 0) / (attTrend.length || 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Deep insights across attendance, finance and enrolment.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Avg Attendance" value={`${avgAttendance}%`} tone="green" icon={<CalendarCheck className="h-5 w-5" />} hint="10-day average" />
        <Stat label="Seat Occupancy" value={`${occupancy}%`} tone="brand" icon={<Users className="h-5 w-5" />} hint="of total capacity" />
        <Stat label="Collected" value={inr(summary.collected)} tone="violet" icon={<Wallet className="h-5 w-5" />} hint={`${summary.rate}% of billed`} />
        <Stat label="Outstanding" value={inr(summary.pending)} tone="amber" icon={<Activity className="h-5 w-5" />} hint="across invoices" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Attendance Rate Trend" icon={<TrendingUp className="h-5 w-5" />} />
          <div className="p-4"><Trends data={attTrend} keys={["Rate"]} colors={["#10b981"]} /></div>
        </Card>
        <Card>
          <CardHeader title="Attendance by Class" icon={<BarChart3 className="h-5 w-5" />} />
          <div className="p-4"><Bars data={classAttendance} keys={["Attendance"]} colors={["#1d40f5"]} /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily Collection" subtitle="Last 14 days" icon={<TrendingUp className="h-5 w-5" />} />
          <div className="p-4"><TrendArea data={collTrend} dataKey="Collected" color="#8b5cf6" /></div>
        </Card>
        <Card>
          <CardHeader title="Payment Methods" icon={<PieChart className="h-5 w-5" />} />
          <div className="p-4"><Donut data={methods} /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue by Fee Head" icon={<Wallet className="h-5 w-5" />} />
          <div className="p-4"><Bars data={byCategory} keys={["Amount"]} colors={["#f97316"]} /></div>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader title="Enrolment by Level" icon={<Users className="h-5 w-5" />} />
            <div className="p-4"><Bars data={enrol} keys={["Students"]} colors={["#0ea5e9"]} height={160} /></div>
          </Card>
          <Card>
            <CardHeader title="Gender Split" icon={<PieChart className="h-5 w-5" />} />
            <div className="p-4"><Donut data={gender} height={160} innerRadius={42} outerRadius={64} /></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
