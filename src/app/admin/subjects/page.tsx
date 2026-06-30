"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { Subject } from "@/lib/types";
import { Card, Table, Th, Td, Badge, Stat, EmptyState } from "@/components/ui";
import { BookOpen, Plus, Edit2, Trash2, X, Loader2, Hash } from "lucide-react";

export default function AdminSubjects() {
  const data = useData();
  const [addOpen, setAddOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  const handleDelete = (sub: Subject) => {
    const users = data.staff.filter((s) => s.subjects.includes(sub.id));
    if (users.length > 0) {
      const names = users.map((s) => s.name).join(", ");
      if (!confirm(`"${sub.name}" is assigned to ${names}. Deleting will remove it from their profile. Continue?`)) return;
    }
    data.deleteSubject(sub.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subjects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Master list of subjects taught across all classes. Teachers are assigned subjects from this list.
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Subject
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Subjects" value={data.subjects.length} tone="brand" icon={<BookOpen className="h-5 w-5" />} />
        <Stat
          label="Assigned to Teachers"
          value={new Set(data.staff.flatMap((s) => s.subjects)).size}
          tone="violet"
          icon={<Hash className="h-5 w-5" />}
        />
        <Stat
          label="Teachers with Subjects"
          value={data.staff.filter((s) => s.role === "teacher" && s.subjects.length > 0).length}
          tone="green"
          icon={<BookOpen className="h-5 w-5" />}
        />
      </div>

      <Card>
        {data.subjects.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="No subjects yet"
              hint='Add your first subject — e.g. "Phonics" with code "PHO".'
            />
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Subject</Th>
                <Th>Code</Th>
                <Th>Description</Th>
                <Th>Assigned to</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.subjects.map((sub) => {
                const assignedStaff = data.staff.filter((s) => s.subjects.includes(sub.id));
                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-semibold text-slate-800">{sub.name}</span>
                    </Td>
                    <Td>
                      <Badge tone="brand">
                        <Hash className="h-3 w-3" />
                        {sub.code}
                      </Badge>
                    </Td>
                    <Td className="text-slate-500">
                      {sub.description || <span className="text-slate-300">—</span>}
                    </Td>
                    <Td>
                      {assignedStaff.length > 0 ? (
                        <span className="text-sm text-slate-600">
                          {assignedStaff.map((s) => s.name).join(", ")}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditSubject(sub)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {(addOpen || editSubject) && (
        <SubjectModal
          subject={editSubject ?? undefined}
          onClose={() => { setAddOpen(false); setEditSubject(null); }}
        />
      )}
    </div>
  );
}

// ── Add / Edit Subject Modal ──────────────────────────────────
function SubjectModal({ subject, onClose }: { subject?: Subject; onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState({
    code: subject?.code ?? "",
    name: subject?.name ?? "",
    description: subject?.description ?? "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);

  const codeClean = form.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const valid = codeClean.length >= 2 && form.name.trim().length > 0;

  // Check if the code is taken by another subject
  const codeTaken = data.subjects.some(
    (s) => s.code === codeClean && s.id !== subject?.id,
  );

  const save = () => {
    if (!valid || codeTaken) return;
    setBusy(true);
    const payload = { code: codeClean, name: form.name.trim(), description: form.description.trim() || undefined };
    if (subject) {
      data.updateSubject(subject.id, payload);
    } else {
      data.addSubject(payload);
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
        <h3 className="text-lg font-bold text-slate-900">{subject ? "Edit Subject" : "Add Subject"}</h3>
        <p className="text-sm text-slate-500">
          {subject ? "Update subject details." : "Create a new subject for the curriculum."}
        </p>

        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Subject Code</label>
              <input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="e.g. PHO"
                maxLength={6}
                className={`input font-mono uppercase ${codeTaken ? "border-rose-400 focus:ring-rose-300" : ""}`}
              />
              {codeTaken && (
                <p className="mt-1 text-xs text-rose-600">Code already taken.</p>
              )}
            </div>
            <div>
              <label className="label">Subject Name</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Phonics"
                className="input"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of the subject"
              className="input"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          <button onClick={save} disabled={!valid || codeTaken || busy} className="btn-primary flex-1 py-2.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : subject ? "Save Changes" : "Add Subject"}
          </button>
        </div>
      </div>
    </div>
  );
}
