"use client";

// ─────────────────────────────────────────────────────────────
// Admin → Grade Scales
// ─────────────────────────────────────────────────────────────
// Grading systems an examination can be marked against. A scale is attached to
// an exam group (and optionally overridden per paper); the bands in force at
// publication are copied into every result, so editing a scale afterwards can
// never rewrite an issued report card.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData, type AuditActor } from "@/lib/store";
import { toast } from "@/components/Toast";
import { Card, CardHeader, Badge, Stat, EmptyState, Loading } from "@/components/ui";
import { GradeBand, GradeScale } from "@/lib/types";
import { validateBands } from "@/lib/exams";
import {
  Award, Plus, X, Trash2, Edit2, CheckCircle2, AlertTriangle, Copy, Loader2, Sparkles,
} from "lucide-react";

/** The grading most CBSE-affiliated schools issue report cards against. */
const CBSE_BANDS: GradeBand[] = [
  { minPercent: 91, maxPercent: 100, grade: "A1", gradePoint: 10, remark: "Outstanding" },
  { minPercent: 81, maxPercent: 90, grade: "A2", gradePoint: 9, remark: "Excellent" },
  { minPercent: 71, maxPercent: 80, grade: "B1", gradePoint: 8, remark: "Very Good" },
  { minPercent: 61, maxPercent: 70, grade: "B2", gradePoint: 7, remark: "Good" },
  { minPercent: 51, maxPercent: 60, grade: "C1", gradePoint: 6, remark: "Fair" },
  { minPercent: 41, maxPercent: 50, grade: "C2", gradePoint: 5, remark: "Satisfactory" },
  { minPercent: 33, maxPercent: 40, grade: "D", gradePoint: 4, remark: "Needs Improvement" },
  { minPercent: 0, maxPercent: 32, grade: "E", gradePoint: 0, remark: "Needs Support" },
];

const uid = () => `gs-${Math.random().toString(36).slice(2, 9)}`;

export default function AdminGradeScales() {
  const { user } = useAuth();
  const data = useData();
  const [editing, setEditing] = useState<GradeScale | null>(null);
  const [busy, setBusy] = useState(false);

  const actor: AuditActor = {
    id: user?.staffId ?? user?.uid ?? "admin",
    name: user?.displayName ?? "Super Admin",
    role: user?.role ?? "superadmin",
  };

  const blank = (): GradeScale => ({
    id: uid(),
    name: "",
    bands: [{ minPercent: 0, maxPercent: 100, grade: "", gradePoint: undefined, remark: "" }],
    active: true,
    createdAt: new Date().toISOString(),
  });

  const seedCbse = () => {
    setBusy(true);
    data.saveGradeScale(
      {
        id: uid(),
        name: "CBSE Standard Grade Scale",
        description: "Eight-band scale with grade points, as used on CBSE report cards.",
        bands: CBSE_BANDS,
        active: true,
        createdAt: new Date().toISOString(),
      },
      actor,
    );
    toast.success("CBSE Standard Grade Scale added.");
    setBusy(false);
  };

  const duplicate = (scale: GradeScale) => {
    data.saveGradeScale(
      { ...scale, id: uid(), name: `${scale.name} (copy)`, createdAt: new Date().toISOString() },
      actor,
    );
    toast.success(`Copied "${scale.name}".`);
  };

  const remove = (scale: GradeScale) => {
    const inUse = data.examGroups.filter((g) => g.gradeScaleId === scale.id);
    if (inUse.length > 0) {
      toast.error(`"${scale.name}" is used by ${inUse.length} examination${inUse.length === 1 ? "" : "s"} and can't be deleted.`);
      return;
    }
    if (!confirm(`Delete "${scale.name}"? Published results keep their own copy of the bands.`)) return;
    data.deleteGradeScale(scale.id);
    toast.success(`"${scale.name}" deleted.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Grade Scales</h1>
          <p className="mt-1 text-sm text-slate-500">
            Percentage bands used to grade examinations. Results keep a copy of the bands they were
            published with.
          </p>
        </div>
        <button onClick={() => setEditing(blank())} className="btn-primary">
          <Plus className="h-4 w-4" /> New grade scale
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Grade scales" value={data.gradeScales.length} tone="brand" icon={<Award className="h-5 w-5" />} />
        <Stat label="Active" value={data.gradeScales.filter((g) => g.active).length} tone="green" icon={<CheckCircle2 className="h-5 w-5" />} />
        <Stat
          label="Used by examinations"
          value={new Set(data.examGroups.map((g) => g.gradeScaleId).filter(Boolean)).size}
          tone="violet"
          icon={<Award className="h-5 w-5" />}
        />
      </div>

      {data.loading && data.gradeScales.length === 0 ? (
        <Card><Loading label="Loading grade scales…" /></Card>
      ) : data.gradeScales.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Award className="h-8 w-8" />}
            title="No grade scales yet"
            hint="Start from the CBSE standard scale, or build your own from scratch."
          />
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={seedCbse} disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Add CBSE standard scale
            </button>
            <button onClick={() => setEditing(blank())} className="btn-ghost">
              <Plus className="h-4 w-4" /> Build my own
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.gradeScales.map((scale) => {
            const issues = validateBands(scale.bands);
            const usedBy = data.examGroups.filter((g) => g.gradeScaleId === scale.id).length;
            return (
              <Card key={scale.id}>
                <CardHeader
                  title={scale.name || "Untitled scale"}
                  subtitle={`${scale.bands.length} bands${usedBy ? ` · used by ${usedBy} examination${usedBy === 1 ? "" : "s"}` : ""}`}
                  icon={<Award className="h-5 w-5" />}
                  action={
                    <div className="flex items-center gap-1">
                      <Badge tone={scale.active ? "green" : "slate"}>{scale.active ? "Active" : "Inactive"}</Badge>
                      <button onClick={() => setEditing(scale)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => duplicate(scale)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(scale)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  }
                />
                {issues.length > 0 && (
                  <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{issues[0]}{issues.length > 1 ? ` (+${issues.length - 1} more)` : ""}</span>
                  </div>
                )}
                <div className="divide-y divide-slate-50">
                  {[...scale.bands].sort((a, b) => b.minPercent - a.minPercent).map((b, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-2">
                      <span className="w-11 shrink-0 rounded-lg bg-brand-50 py-1 text-center text-sm font-bold text-brand-700">
                        {b.grade || "—"}
                      </span>
                      <span className="w-24 shrink-0 text-sm text-slate-600">{b.minPercent}–{b.maxPercent}%</span>
                      {b.gradePoint !== undefined && (
                        <span className="w-14 shrink-0 text-xs text-slate-400">GP {b.gradePoint}</span>
                      )}
                      <span className="truncate text-sm text-slate-500">{b.remark}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <GradeScaleModal
          scale={editing}
          actor={actor}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function GradeScaleModal({
  scale, actor, onClose,
}: { scale: GradeScale; actor: AuditActor; onClose: () => void }) {
  const data = useData();
  const [name, setName] = useState(scale.name);
  const [description, setDescription] = useState(scale.description ?? "");
  const [active, setActive] = useState(scale.active);
  const [bands, setBands] = useState<GradeBand[]>(
    [...scale.bands].sort((a, b) => b.minPercent - a.minPercent),
  );

  const setBand = (i: number, patch: Partial<GradeBand>) =>
    setBands((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addBand = () =>
    setBands((b) => [...b, { minPercent: 0, maxPercent: 0, grade: "", remark: "" }]);
  const removeBand = (i: number) => setBands((b) => b.filter((_, idx) => idx !== i));

  const issues = validateBands(bands);
  const canSave = name.trim().length > 0 && bands.length > 0 && issues.length === 0;

  const save = () => {
    if (!canSave) return;
    data.saveGradeScale(
      {
        ...scale,
        name: name.trim(),
        description: description.trim() || undefined,
        active,
        bands: [...bands].sort((a, b) => b.minPercent - a.minPercent),
      },
      actor,
    );
    toast.success(`"${name.trim()}" saved.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">{scale.name ? "Edit grade scale" : "New grade scale"}</h3>
            <p className="text-sm text-slate-500">Bands are inclusive and must cover 0–100% without overlapping.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Scale name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="CBSE Standard Grade Scale" className="input" autoFocus />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={active ? "active" : "inactive"} onChange={(e) => setActive(e.target.value === "active")} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="input" />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0">Bands</label>
              <button onClick={addBand} className="btn-ghost px-2.5 py-1 text-xs"><Plus className="h-3.5 w-3.5" /> Add band</button>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[60px_60px_70px_60px_1fr_32px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Min %</span><span>Max %</span><span>Grade</span><span>Point</span><span>Remark</span><span />
              </div>
              <div className="divide-y divide-slate-50">
                {bands.map((b, i) => (
                  <div key={i} className="grid grid-cols-[60px_60px_70px_60px_1fr_32px] items-center gap-2 px-3 py-2">
                    <input
                      type="number" min={0} max={100} value={b.minPercent}
                      onChange={(e) => setBand(i, { minPercent: Number(e.target.value) })}
                      className="input px-2 py-1 text-sm"
                    />
                    <input
                      type="number" min={0} max={100} value={b.maxPercent}
                      onChange={(e) => setBand(i, { maxPercent: Number(e.target.value) })}
                      className="input px-2 py-1 text-sm"
                    />
                    <input
                      value={b.grade} onChange={(e) => setBand(i, { grade: e.target.value })}
                      placeholder="A1" className="input px-2 py-1 text-sm font-semibold"
                    />
                    <input
                      type="number" min={0} value={b.gradePoint ?? ""}
                      onChange={(e) => setBand(i, { gradePoint: e.target.value === "" ? undefined : Number(e.target.value) })}
                      placeholder="—" className="input px-2 py-1 text-sm"
                    />
                    <input
                      value={b.remark ?? ""} onChange={(e) => setBand(i, { remark: e.target.value })}
                      placeholder="Outstanding" className="input px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => removeBand(i)}
                      className="rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove band"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              {issues.map((msg, i) => (
                <p key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {msg}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={!canSave} className="btn-primary flex-1 py-2.5">
            <CheckCircle2 className="h-4 w-4" /> Save grade scale
          </button>
        </div>
      </div>
    </div>
  );
}
