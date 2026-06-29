"use client";

import { useState } from "react";
import { useTeacher, ClassSwitcher } from "../teacher-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { Photo } from "@/components/Photo";
import { todayISO, formatDate } from "@/lib/utils";
import { DailyUpdate } from "@/lib/types";
import { Camera, Smile, Soup, Moon, Send, Plus, ImagePlus } from "lucide-react";

const moods: DailyUpdate["mood"][] = ["happy", "okay", "tired", "unwell"];
const ate: DailyUpdate["ate"][] = ["all", "some", "none"];
const naps: DailyUpdate["nap"][] = ["slept", "rested", "active"];
const moodEmoji: Record<string, string> = { happy: "😊", okay: "🙂", tired: "😴", unwell: "🤒" };

export default function TeacherUpdates() {
  const { staff, activeClass } = useTeacher();
  const data = useData();
  const [mood, setMood] = useState<DailyUpdate["mood"]>("happy");
  const [meal, setMeal] = useState<DailyUpdate["ate"]>("all");
  const [nap, setNap] = useState<DailyUpdate["nap"]>("active");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState(2);

  if (!activeClass) return <EmptyState title="No class assigned." />;
  const feed = data.dailyUpdates
    .filter((u) => u.classId === activeClass.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const post = () => {
    if (!note.trim()) return;
    data.addDailyUpdate({
      classId: activeClass.id, date: todayISO(), mood, ate: meal, nap, note: note.trim(),
      photoUrls: Array.from({ length: photos }, (_, i) => `new-${Date.now()}-${i}`),
      postedBy: staff?.id ?? "s-anita",
    });
    setNote("");
    setPhotos(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Updates</h1>
          <p className="mt-1 text-sm text-slate-500">Share {activeClass.name}&apos;s day with parents.</p>
        </div>
        <ClassSwitcher />
      </div>

      <Card>
        <CardHeader title="Post Today's Update" icon={<Camera className="h-5 w-5" />} />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Picker label="Class Mood" icon={<Smile className="h-4 w-4" />} options={moods} value={mood} onChange={setMood} render={(m) => `${moodEmoji[m]} ${m}`} />
            <Picker label="Meals" icon={<Soup className="h-4 w-4" />} options={ate} value={meal} onChange={setMeal} render={(m) => `Ate ${m}`} />
            <Picker label="Rest" icon={<Moon className="h-4 w-4" />} options={naps} value={nap} onChange={setNap} render={(m) => m} />
          </div>
          <div>
            <label className="label">Note to parents</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What did the class explore today?" className="input resize-none" />
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setPhotos((p) => p + 1)} className="btn-ghost text-sm"><ImagePlus className="h-4 w-4" /> Add photo ({photos})</button>
            <button onClick={post} disabled={!note.trim()} className="btn-primary"><Send className="h-4 w-4" /> Post update</button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {feed.length === 0 && <EmptyState icon={<Camera className="h-8 w-8" />} title="No updates posted yet" />}
        {feed.map((u) => {
          const author = data.staff.find((s) => s.id === u.postedBy);
          return (
            <Card key={u.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{formatDate(u.date, { weekday: "long", day: "numeric", month: "short" })}</p>
                  <p className="text-xs text-slate-400">by {author?.name ?? "Teacher"}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="violet">{moodEmoji[u.mood]} {u.mood}</Badge>
                  <Badge tone="amber">ate {u.ate}</Badge>
                  <Badge tone="sky">{u.nap}</Badge>
                </div>
              </div>
              <div className="p-5">
                <p className="text-slate-700">{u.note}</p>
                {u.photoUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {u.photoUrls.map((p, i) => <Photo key={i} id={`${u.id}-${p}-${i}`} className="aspect-square" />)}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Picker<T extends string>({
  label, icon, options, value, onChange, render,
}: { label: string; icon: React.ReactNode; options: T[]; value: T; onChange: (v: T) => void; render: (v: T) => string }) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">{icon}{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold capitalize ${value === o ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
