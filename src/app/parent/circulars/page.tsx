"use client";

import { useData } from "@/lib/store";
import { Card, EmptyState, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Megaphone, Pin } from "lucide-react";

const catTone: Record<string, "red" | "violet" | "green" | "slate" | "brand"> = {
  alert: "red", event: "violet", holiday: "green", newsletter: "brand", notice: "slate",
};

export default function ParentCirculars() {
  const { circulars, staff } = useData();
  const list = circulars
    .filter((c) => c.audience === "all" || c.audience === "parents")
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notices & Circulars</h1>
        <p className="mt-1 text-sm text-slate-500">School announcements, events and alerts.</p>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-8 w-8" />} title="No circulars yet" />
      ) : (
        <div className="space-y-4">
          {list.map((c) => {
            const author = staff.find((s) => s.id === c.postedBy);
            return (
              <Card key={c.id} className={`p-5 ${c.pinned ? "border-brand-200 bg-brand-50/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {c.pinned && <Pin className="h-4 w-4 text-brand-600" />}
                    <h3 className="font-semibold text-slate-900">{c.title}</h3>
                  </div>
                  <Badge tone={catTone[c.category]}>{c.category}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.body}</p>
                <p className="mt-3 text-xs text-slate-400">{formatDate(c.date)} · {author?.name ?? "School"}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
