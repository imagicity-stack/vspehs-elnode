"use client";

import { useState } from "react";
import { useTeacher } from "../teacher-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, Progress, EmptyState } from "@/components/ui";
import { todayISO } from "@/lib/utils";
import { ClipboardCheck, Plus, CheckCircle2 } from "lucide-react";
import { TaskItem } from "@/lib/types";

const catTone: Record<string, "brand" | "violet" | "amber" | "red"> = {
  teaching: "brand", care: "violet", admin: "amber", safety: "red",
};

export default function TeacherTasks() {
  const { staff } = useTeacher();
  const data = useData();
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<TaskItem["category"]>("teaching");
  const today = todayISO();

  const tasks = data.taskItems.filter((t) => t.staffId === staff?.id && t.date === today);
  const done = tasks.filter((t) => t.done).length;

  const add = () => {
    if (!title.trim()) return;
    data.addTask({ staffId: staff?.id ?? "s-anita", date: today, title: title.trim(), category: cat, done: false });
    setTitle("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Task Checklist</h1>
        <p className="mt-1 text-sm text-slate-500">Stay on top of teaching, care, admin and safety duties.</p>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">{done} of {tasks.length} completed today</span>
          <span className="font-bold text-brand-600">{tasks.length ? Math.round((done / tasks.length) * 100) : 0}%</span>
        </div>
        <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} tone={done === tasks.length && tasks.length > 0 ? "green" : "brand"} />
      </Card>

      <Card>
        <CardHeader title="Today's Tasks" icon={<ClipboardCheck className="h-5 w-5" />} />
        <div className="flex gap-2 border-b border-slate-100 p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task…" className="input" />
          <select value={cat} onChange={(e) => setCat(e.target.value as TaskItem["category"])} className="input w-36">
            {(["teaching", "care", "admin", "safety"] as const).map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
          <button onClick={add} className="btn-primary"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="divide-y divide-slate-100">
          {tasks.length === 0 && <div className="p-5"><EmptyState title="No tasks yet" hint="Add your first task above." /></div>}
          {tasks.map((t) => (
            <button key={t.id} onClick={() => data.toggleTask(t.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
              {t.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-300" />}
              <span className={`flex-1 text-sm ${t.done ? "text-slate-400 line-through" : "font-medium text-slate-800"}`}>{t.title}</span>
              <Badge tone={catTone[t.category]}>{t.category}</Badge>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
