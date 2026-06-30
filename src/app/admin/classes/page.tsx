"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { SchoolClass } from "@/lib/types";
import { Card, Badge, Avatar, Progress, Stat, EmptyState } from "@/components/ui";
import { attendanceForDate } from "@/lib/analytics";
import { fullName, todayISO } from "@/lib/utils";
import {
  School, Users, DoorOpen, Plus, Edit2, Trash2, X, Loader2,
  UserCheck, GraduationCap,
} from "lucide-react";

const LEVELS: SchoolClass["level"][] = ["Playgroup", "Nursery", "LKG", "UKG"];

export default function AdminClasses() {
  const data = useData();
  const today = todayISO();
  const [addOpen, setAddOpen] = useState(false);
  const [editClass, setEditClass] = useState<SchoolClass | null>(null);
  const [assignClass, setAssignClass] = useState<SchoolClass | null>(null);

  const handleDelete = (id: string) => {
    if (data.students.some((s) => s.classId === id)) {
      alert("Cannot delete a class that has enrolled students.");
      return;
    }
    data.deleteClass(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Classes</h1>
          <p className="mt-1 text-sm text-slate-500">Sections, rooms and class teacher assignment.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Class
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Classes" value={data.classes.length} tone="brand" icon={<School className="h-5 w-5" />} />
        <Stat label="Total Seats" value={data.classes.reduce((s, c) => s + c.capacity, 0)} tone="violet" icon={<DoorOpen className="h-5 w-5" />} />
        <Stat label="Enrolled" value={data.students.length} tone="green" icon={<Users className="h-5 w-5" />} />
      </div>

      {data.classes.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No classes yet"
            hint="Add your first class to get started — Playgroup, Nursery, LKG or UKG."
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.classes.map((c) => {
            const strength = data.students.filter((s) => s.classId === c.id).length;
            const teacher = data.staff.find((s) => s.id === c.classTeacherId);
            const helpers = data.staff.filter(
              (s) => s.role === "helper" && s.assignedClassIds.includes(c.id),
            );
            const att = attendanceForDate(
              data.attendance.filter((a) => a.classId === c.id),
              today,
            );
            const occupancy = c.capacity > 0 ? Math.round((strength / c.capacity) * 100) : 0;

            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
                      {c.level[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-400">
                        {c.level} · Section {c.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAssignClass(c)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                      title="Assign teacher"
                    >
                      <UserCheck className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditClass(c)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Edit class"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete class"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <Badge tone="slate">{c.room}</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Occupancy</span>
                      <span className="font-semibold text-slate-700">
                        {strength}/{c.capacity}
                      </span>
                    </div>
                    <Progress value={occupancy} tone={occupancy > 90 ? "red" : "brand"} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Attendance today</span>
                    <span className="font-semibold text-emerald-600">
                      {att.total ? `${att.rate}%` : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="label flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" /> Class Teacher
                  </p>
                  {teacher ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={teacher.name} src={teacher.photoUrl} size={28} />
                      <span className="text-sm font-medium text-slate-700">{teacher.name}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAssignClass(c)}
                      className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Assign teacher
                    </button>
                  )}
                  {helpers.length > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      Support: {helpers.map((h) => h.name).join(", ")}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(addOpen || editClass) && (
        <ClassModal
          cls={editClass ?? undefined}
          onClose={() => { setAddOpen(false); setEditClass(null); }}
        />
      )}

      {assignClass && (
        <AssignTeacherModal
          cls={assignClass}
          onClose={() => setAssignClass(null)}
        />
      )}
    </div>
  );
}

// ── Add / Edit Class modal ────────────────────────────────────
function ClassModal({ cls, onClose }: { cls?: SchoolClass; onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState({
    name: cls?.name ?? "",
    level: cls?.level ?? "Playgroup" as SchoolClass["level"],
    section: cls?.section ?? "A",
    room: cls?.room ?? "",
    capacity: String(cls?.capacity ?? 20),
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);

  const valid = form.name.trim() && form.room.trim() && Number(form.capacity) > 0;

  const save = () => {
    if (!valid) return;
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      level: form.level,
      section: form.section.trim() || "A",
      room: form.room.trim(),
      capacity: Number(form.capacity),
      classTeacherId: cls?.classTeacherId ?? "",
    };
    if (cls) {
      data.updateClass(cls.id, payload);
    } else {
      data.addClass(payload);
    }
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">{cls ? "Edit Class" : "Add Class"}</h3>
        <p className="text-sm text-slate-500">
          {cls ? "Update the class details." : "Create a new class section."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Class Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Nursery A"
              className="input"
            />
          </div>
          <div>
            <label className="label">Level</label>
            <select value={form.level} onChange={(e) => set("level", e.target.value)} className="input">
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <input
              value={form.section}
              onChange={(e) => set("section", e.target.value)}
              placeholder="A"
              className="input"
            />
          </div>
          <div>
            <label className="label">Room / Label</label>
            <input
              value={form.room}
              onChange={(e) => set("room", e.target.value)}
              placeholder="Sunflower Room"
              className="input"
            />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input
              type="number"
              min={1}
              max={60}
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={!valid || busy} className="btn-primary flex-1 py-2.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : cls ? "Save Changes" : "Create Class"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Teacher modal ──────────────────────────────────────
function AssignTeacherModal({ cls, onClose }: { cls: SchoolClass; onClose: () => void }) {
  const data = useData();
  const teachers = data.staff.filter((s) => s.role === "teacher" || s.role === "helper");
  const [selected, setSelected] = useState(cls.classTeacherId ?? "");
  const [busy, setBusy] = useState(false);

  const save = () => {
    setBusy(true);
    data.updateClass(cls.id, { classTeacherId: selected });
    // Update assignedClassIds on the selected teacher
    if (selected) {
      const prev = data.staff.find((s) => s.id === selected);
      if (prev && !prev.assignedClassIds.includes(cls.id)) {
        data.updateStaff(selected, { assignedClassIds: [...prev.assignedClassIds, cls.id] });
      }
    }
    // Remove class from the previous teacher if changed
    if (cls.classTeacherId && cls.classTeacherId !== selected) {
      const prev = data.staff.find((s) => s.id === cls.classTeacherId);
      if (prev) {
        data.updateStaff(cls.classTeacherId, {
          assignedClassIds: prev.assignedClassIds.filter((id) => id !== cls.id),
        });
      }
    }
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">Assign Class Teacher</h3>
        <p className="text-sm text-slate-500">{cls.name}</p>

        <div className="mt-4 space-y-2">
          <button
            onClick={() => setSelected("")}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
              selected === "" ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <X className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-slate-500">No teacher assigned</span>
          </button>

          {teachers.length === 0 && (
            <p className="py-3 text-center text-sm text-slate-400">
              No teachers in the directory yet. Add staff first.
            </p>
          )}

          {teachers.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                selected === t.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Avatar name={t.name} src={t.photoUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{t.name}</p>
                <p className="truncate text-xs text-slate-400 capitalize">{t.role}</p>
              </div>
              {selected === t.id && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-primary flex-1 py-2.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
