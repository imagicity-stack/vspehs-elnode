"use client";

import { useState } from "react";
import { useTeacher, ClassSwitcher } from "../teacher-context";
import { useData } from "@/lib/store";
import { Card, Avatar, Badge, EmptyState } from "@/components/ui";
import { fullName, ageFromDob, formatDate } from "@/lib/utils";
import { Student } from "@/lib/types";
import { Droplet, AlertTriangle, Phone, ShieldCheck, X, Users, Cake } from "lucide-react";

export default function TeacherStudents() {
  const { activeClass } = useTeacher();
  const data = useData();
  const [selected, setSelected] = useState<Student | null>(null);
  if (!activeClass) return <EmptyState title="No class assigned." />;

  const classStudents = data.students.filter((s) => s.classId === activeClass.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Students</h1>
          <p className="mt-1 text-sm text-slate-500">{activeClass.name} · {classStudents.length} children. Tap a card for safety details.</p>
        </div>
        <ClassSwitcher />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classStudents.map((s) => (
          <button key={s.id} onClick={() => setSelected(s)} className="text-left">
            <Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex items-center gap-3">
                <Avatar name={fullName(s)} src={s.photoUrl} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{fullName(s)}</p>
                  <p className="text-xs text-slate-400">Roll #{s.rollNo} · {ageFromDob(s.dob)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="slate"><Droplet className="h-3.5 w-3.5" /> {s.bloodGroup}</Badge>
                {s.allergies.length > 0 && <Badge tone="red"><AlertTriangle className="h-3.5 w-3.5" /> {s.allergies.length} allerg{s.allergies.length === 1 ? "y" : "ies"}</Badge>}
                {s.transportRoute && s.transportRoute !== "Self" && <Badge tone="sky">Transport</Badge>}
              </div>
            </Card>
          </button>
        ))}
      </div>

      {selected && <StudentModal student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StudentModal({ student, onClose }: { student: Student; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-soft">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-6 text-white">
          <div className="flex items-center gap-4">
            <Avatar name={fullName(student)} src={student.photoUrl} size={64} className="ring-4 ring-white/30" />
            <div>
              <h3 className="text-xl font-bold">{fullName(student)}</h3>
              <p className="text-brand-100">Roll #{student.rollNo} · Admission #{student.admissionNo}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="chip bg-white/15 text-white"><Cake className="h-3.5 w-3.5" /> {ageFromDob(student.dob)}</span>
                <span className="chip bg-white/15 text-white"><Droplet className="h-3.5 w-3.5" /> {student.bloodGroup}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-5 p-6">
          <Section title="Allergies & Medical" icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}>
            {student.allergies.length ? (
              <div className="flex flex-wrap gap-2">{student.allergies.map((a) => <Badge key={a} tone="red">{a}</Badge>)}</div>
            ) : <p className="text-sm text-slate-500">None</p>}
            {student.medicalNotes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{student.medicalNotes}</p>}
          </Section>

          <Section title="Emergency Contacts" icon={<Phone className="h-4 w-4 text-brand-500" />}>
            <div className="space-y-2">
              {student.emergencyContacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{c.name} <span className="text-slate-400">· {c.relation}</span></span>
                  <a href={`tel:${c.phone}`} className="font-semibold text-brand-600">{c.phone}</a>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Authorised Pickup" icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}>
            <div className="space-y-2">
              {student.pickupPersons.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{p.name} <span className="text-slate-400">· {p.relation}</span></span>
                  {p.authorised ? <Badge tone="green">Authorised</Badge> : <Badge tone="slate">No</Badge>}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Family" icon={<Users className="h-4 w-4 text-slate-500" />}>
            <div className="space-y-1 text-sm text-slate-600">
              <p>Father: <span className="font-medium text-slate-800">{student.fatherName}</span></p>
              <p>Mother: <span className="font-medium text-slate-800">{student.motherName}</span></p>
              <p>Primary contact: <span className="font-medium text-slate-800">{student.primaryContact}</span></p>
              {student.siblings.length > 0 && <p>Siblings: <span className="font-medium text-slate-800">{student.siblings.map((s) => s.name).join(", ")}</span></p>}
              <p>Admitted: <span className="font-medium text-slate-800">{formatDate(student.admissionDate)}</span></p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{icon}{title}</p>
      {children}
    </div>
  );
}
