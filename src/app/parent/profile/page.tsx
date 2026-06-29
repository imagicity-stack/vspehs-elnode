"use client";

import { useChild, ChildSwitcher } from "../child-context";
import { useData } from "@/lib/store";
import { Card, CardHeader, Avatar, Badge, EmptyState } from "@/components/ui";
import { fullName, ageFromDob, formatDate } from "@/lib/utils";
import {
  HeartPulse, Phone, ShieldCheck, Users, School, MapPin, Droplet, AlertTriangle,
  Cake, Bus, UserCheck,
} from "lucide-react";

export default function ParentProfile() {
  const { child } = useChild();
  const { classes } = useData();
  if (!child) return <EmptyState title="No child linked." />;
  const cls = classes.find((c) => c.id === child.classId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Child Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Safety & contact information on file.</p>
        </div>
        <ChildSwitcher />
      </div>

      {/* Identity card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-brand-800 px-6 py-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Avatar name={fullName(child)} src={child.photoUrl} size={80} className="ring-4 ring-white/30" />
            <div className="flex-1 text-white">
              <h2 className="text-2xl font-bold">{fullName(child)}</h2>
              <p className="text-brand-100">{cls?.name} · Roll #{child.rollNo} · Admission #{child.admissionNo}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="chip bg-white/15 text-white"><Cake className="h-3.5 w-3.5" /> {formatDate(child.dob)} ({ageFromDob(child.dob)})</span>
                <span className="chip bg-white/15 text-white"><Droplet className="h-3.5 w-3.5" /> {child.bloodGroup}</span>
                <span className="chip bg-white/15 text-white capitalize">{child.gender}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Medical / safety */}
        <Card>
          <CardHeader title="Medical & Allergies" icon={<HeartPulse className="h-5 w-5" />} />
          <div className="space-y-4 p-5">
            <div>
              <p className="label">Allergies</p>
              {child.allergies.length ? (
                <div className="flex flex-wrap gap-2">
                  {child.allergies.map((a) => (
                    <Badge key={a} tone="red"><AlertTriangle className="h-3.5 w-3.5" /> {a}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">None recorded</p>
              )}
            </div>
            <div>
              <p className="label">Blood Group</p>
              <p className="text-sm font-semibold text-slate-800">{child.bloodGroup}</p>
            </div>
            {child.medicalNotes && (
              <div>
                <p className="label">Medical Notes</p>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{child.medicalNotes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Emergency contacts */}
        <Card>
          <CardHeader title="Emergency Contacts" icon={<Phone className="h-5 w-5" />} />
          <div className="divide-y divide-slate-100">
            {child.emergencyContacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="font-semibold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.relation}</p>
                </div>
                <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  <Phone className="h-4 w-4" /> {c.phone}
                </a>
              </div>
            ))}
          </div>
        </Card>

        {/* Pickup persons */}
        <Card>
          <CardHeader title="Authorised Pickup Persons" icon={<ShieldCheck className="h-5 w-5" />} />
          <div className="divide-y divide-slate-100">
            {child.pickupPersons.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} size={36} />
                  <div>
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.relation} · {p.phone}</p>
                  </div>
                </div>
                {p.authorised ? (
                  <Badge tone="green"><UserCheck className="h-3.5 w-3.5" /> Authorised</Badge>
                ) : (
                  <Badge tone="slate">Not authorised</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Family & school */}
        <Card>
          <CardHeader title="Family & Background" icon={<Users className="h-5 w-5" />} />
          <div className="space-y-4 p-5 text-sm">
            <Row label="Father" value={child.fatherName} />
            <Row label="Mother" value={child.motherName} />
            <Row label="Primary Contact" value={child.primaryContact} />
            <div>
              <p className="label">Siblings</p>
              {child.siblings.length ? (
                <div className="space-y-1.5">
                  {child.siblings.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="text-slate-400">· {s.relation}{s.className ? ` · ${s.className}` : ""}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No siblings on record</p>
              )}
            </div>
            <Row label="Previous School" value={child.previousSchool || "—"} icon={<School className="h-4 w-4 text-slate-400" />} />
            <Row label="Transport" value={child.transportRoute || "Self"} icon={<Bus className="h-4 w-4 text-slate-400" />} />
            <Row label="Address" value={child.address} icon={<MapPin className="h-4 w-4 text-slate-400" />} />
            <Row label="Admitted On" value={formatDate(child.admissionDate)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-medium text-slate-800">{icon}{value}</span>
    </div>
  );
}
