"use client";

import { useState } from "react";
import { useTeacher, ClassSwitcher } from "../teacher-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { todayISO, formatDate, relativeDay } from "@/lib/utils";
import { BookOpen, Send } from "lucide-react";

export default function TeacherHomework() {
  const { staff, activeClass } = useTeacher();
  const data = useData();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Phonics");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");

  if (!activeClass) return <EmptyState title="No class assigned." />;
  const items = data.homework
    .filter((h) => h.classId === activeClass.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const post = () => {
    if (!title.trim()) return;
    data.addHomework({
      classId: activeClass.id, title: title.trim(), subject, description: description.trim(),
      date: todayISO(), dueDate: due || undefined, postedBy: staff?.id ?? "s-priya",
    });
    setTitle(""); setDescription(""); setDue("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Homework & Activities</h1>
          <p className="mt-1 text-sm text-slate-500">Post assignments for {activeClass.name}.</p>
        </div>
        <ClassSwitcher />
      </div>

      <Card>
        <CardHeader title="New Assignment" icon={<BookOpen className="h-5 w-5" />} />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Trace the letter 'S'" className="input" />
            </div>
            <div>
              <label className="label">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input">
                {["Phonics", "Numbers", "Rhymes", "Story Time", "Art", "EVS", "Show & Tell"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Instructions</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What should children do at home?" className="input resize-none" />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <label className="label">Due date (optional)</label>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" />
            </div>
            <button onClick={post} disabled={!title.trim()} className="btn-primary"><Send className="h-4 w-4" /> Post homework</button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.length === 0 && <EmptyState icon={<BookOpen className="h-8 w-8" />} title="No homework posted yet" />}
        {items.map((h) => (
          <Card key={h.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{h.title}</h3>
              <Badge tone="sky">{h.subject}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{h.description}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Posted {formatDate(h.date)}</span>
              {h.dueDate && <span className="font-semibold text-amber-600">Due {relativeDay(h.dueDate)}</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
