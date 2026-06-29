"use client";

import { useChild, ChildSwitcher } from "../child-context";
import { useData } from "@/lib/store";
import { Card, EmptyState, Badge } from "@/components/ui";
import { formatDate, relativeDay } from "@/lib/utils";
import { BookOpen } from "lucide-react";

export default function ParentHomework() {
  const { child } = useChild();
  const { homework, staff } = useData();
  if (!child) return <EmptyState title="No child linked." />;

  const items = homework
    .filter((h) => h.classId === child.classId)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Homework & Activities</h1>
          <p className="mt-1 text-sm text-slate-500">Assignments and home activities for {child.firstName}.</p>
        </div>
        <ChildSwitcher />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8" />} title="No homework right now 🎉" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((h) => {
            const teacher = staff.find((s) => s.id === h.postedBy);
            return (
              <Card key={h.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{h.title}</h3>
                  <Badge tone="sky">{h.subject}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{h.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Posted {formatDate(h.date)} · {teacher?.name}</span>
                  {h.dueDate && <span className="font-semibold text-amber-600">Due {relativeDay(h.dueDate)}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
