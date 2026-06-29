"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { todayISO, formatDate } from "@/lib/utils";
import { Circular } from "@/lib/types";
import { Megaphone, Send, Pin } from "lucide-react";

const cats: Circular["category"][] = ["notice", "event", "holiday", "alert", "newsletter"];
const catTone: Record<string, "red" | "violet" | "green" | "slate" | "brand"> = {
  alert: "red", event: "violet", holiday: "green", newsletter: "brand", notice: "slate",
};

export default function AdminCirculars() {
  const data = useData();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Circular["category"]>("notice");
  const [audience, setAudience] = useState<"all" | "parents" | "staff">("parents");
  const [pinned, setPinned] = useState(false);

  const list = data.circulars
    .slice()
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.localeCompare(a.date));

  const post = () => {
    if (!title.trim() || !body.trim()) return;
    data.addCircular({
      title: title.trim(), body: body.trim(), category, audience, pinned,
      date: todayISO(), postedBy: user?.staffId ?? "s-admin",
    });
    setTitle(""); setBody(""); setPinned(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Circulars & Alerts</h1>
        <p className="mt-1 text-sm text-slate-500">Broadcast notices, events and alerts to parents and staff.</p>
      </div>

      <Card>
        <CardHeader title="New Circular" icon={<Megaphone className="h-5 w-5" />} />
        <div className="space-y-4 p-5">
          <div>
            <label className="label">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Day — Save the Date!" className="input" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="input resize-none" placeholder="Write your announcement…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as Circular["category"])} className="input capitalize">
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Audience</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value as any)} className="input capitalize">
                <option value="parents">Parents</option><option value="staff">Staff</option><option value="all">Everyone</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                Pin to top
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={post} disabled={!title.trim() || !body.trim()} className="btn-primary"><Send className="h-4 w-4" /> Publish circular</button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {list.length === 0 && <EmptyState icon={<Megaphone className="h-8 w-8" />} title="No circulars yet" />}
        {list.map((c) => {
          const author = data.staff.find((s) => s.id === c.postedBy);
          return (
            <Card key={c.id} className={`p-5 ${c.pinned ? "border-brand-200 bg-brand-50/40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {c.pinned && <Pin className="h-4 w-4 text-brand-600" />}
                  <h3 className="font-semibold text-slate-900">{c.title}</h3>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone={catTone[c.category]}>{c.category}</Badge>
                  <Badge tone="slate">{typeof c.audience === "string" ? c.audience : "classes"}</Badge>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.body}</p>
              <p className="mt-3 text-xs text-slate-400">{formatDate(c.date)} · {author?.name ?? "Admin"}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
