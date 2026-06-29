"use client";

import { useChild, ChildSwitcher } from "../child-context";
import { useData } from "@/lib/store";
import { Card, EmptyState, Badge } from "@/components/ui";
import { Photo } from "@/components/Photo";
import { formatDate, relativeDay } from "@/lib/utils";
import { Smile, Soup, Moon, Camera } from "lucide-react";

const moodEmoji: Record<string, string> = { happy: "😊", okay: "🙂", tired: "😴", unwell: "🤒" };

export default function ParentUpdates() {
  const { child } = useChild();
  const { dailyUpdates, staff } = useData();
  if (!child) return <EmptyState title="No child linked." />;

  const feed = dailyUpdates
    .filter((u) => u.classId === child.classId)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Updates</h1>
          <p className="mt-1 text-sm text-slate-500">Photos and notes from {child.firstName}&apos;s classroom.</p>
        </div>
        <ChildSwitcher />
      </div>

      {feed.length === 0 ? (
        <EmptyState icon={<Camera className="h-8 w-8" />} title="No updates yet" hint="Your teacher posts daily classroom moments here." />
      ) : (
        <div className="space-y-5">
          {feed.map((u) => {
            const teacher = staff.find((s) => s.id === u.postedBy);
            return (
              <Card key={u.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{moodEmoji[u.mood]}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{formatDate(u.date, { weekday: "long", day: "numeric", month: "short" })}</p>
                      <p className="text-xs text-slate-400">{relativeDay(u.date)} · by {teacher?.name ?? "Teacher"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="violet"><Smile className="h-3.5 w-3.5" /> {u.mood}</Badge>
                    <Badge tone="amber"><Soup className="h-3.5 w-3.5" /> ate {u.ate}</Badge>
                    <Badge tone="sky"><Moon className="h-3.5 w-3.5" /> {u.nap}</Badge>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-slate-700">{u.note}</p>
                  {u.photoUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {u.photoUrls.map((p, i) => (
                        <Photo key={i} id={`${u.id}-${p}-${i}`} className="aspect-square" />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
