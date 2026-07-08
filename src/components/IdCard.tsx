"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Student } from "@/lib/types";
import { SCHOOL_NAME } from "@/lib/branding";
import { formatDate } from "@/lib/utils";

const YELLOW = "#f6ce46";
const NAVY = "#1f2d5a";
const INK = "#3a2a00";

// School logo — uses /public/logo_black.png when present, else a text mark.
function Logo({ className = "" }: { className?: string }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logo_black.png" alt="School logo" onError={() => setOk(false)} className={`mx-auto h-14 w-auto object-contain ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} style={{ color: INK }}>
      <GraduationCap className="h-7 w-7 shrink-0" />
      <span className="max-w-[190px] text-center text-xs font-extrabold uppercase leading-tight tracking-wide">{SCHOOL_NAME}</span>
    </div>
  );
}

// QR — uses /public/qr.svg (placeholder shipped; replace with your own).
function Qr() {
  const [ok, setOk] = useState(true);
  if (ok) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/qr.svg" alt="QR code" onError={() => setOk(false)} className="h-[76px] w-[76px]" />;
  }
  return <div className="flex h-[76px] w-[76px] items-center justify-center rounded-lg border-2 border-dashed text-[10px]" style={{ borderColor: `${INK}66`, color: `${INK}88` }}>QR</div>;
}

// Playful sticker layer echoing the reference art.
function Stickers() {
  const items: { e: string; s: string }[] = [
    { e: "🏀", s: "left-2 top-24 rotate-[-12deg]" },
    { e: "🎓", s: "right-2 top-20 rotate-[10deg]" },
    { e: "🦖", s: "right-3 top-44 rotate-[6deg]" },
    { e: "📚", s: "left-2 bottom-28 rotate-[-8deg]" },
    { e: "🏆", s: "right-4 bottom-28 rotate-[8deg]" },
  ];
  return (
    <>
      {items.map((it, i) => (
        <span key={i} className={`pointer-events-none absolute text-2xl ${it.s}`} aria-hidden>{it.e}</span>
      ))}
    </>
  );
}

function Squiggles() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <path d="M-10 40 q30 -30 60 0 t60 0" fill="none" stroke="#eab308" strokeWidth="7" strokeLinecap="round" opacity="0.5" />
      <path d="M240 470 q30 -28 58 -2" fill="none" stroke="#eab308" strokeWidth="7" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

const CARD = "idcard relative w-[320px] shrink-0 overflow-hidden rounded-[22px] p-5";

export function IdCard({ student, className }: { student: Student; className: string }) {
  const initial = (student.firstName || "?").charAt(0).toUpperCase();
  return (
    <div className="idcard-pair flex flex-wrap gap-4">
      {/* ── FRONT ── */}
      <div className={`${CARD} flex flex-col items-center text-center`} style={{ background: YELLOW, height: 505 }}>
        <Squiggles />
        <Stickers />
        <div className="relative z-10 w-full"><Logo /></div>

        <div className="relative z-10 mt-4 h-[186px] w-[186px] rounded-full bg-white p-1.5 shadow-md">
          {student.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={student.photoUrl} alt={student.firstName} className="h-full w-full rounded-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-5xl font-extrabold text-slate-300">{initial}</div>}
        </div>

        <div className="relative z-10 mt-auto w-full pt-4">
          <h3 className="text-2xl font-extrabold uppercase leading-tight tracking-wide" style={{ color: NAVY }}>
            {student.firstName} {student.lastName}
          </h3>
          <p className="mt-1 text-sm font-semibold" style={{ color: `${INK}cc` }}>Sc No. : {student.admissionNo}</p>
          <span className="mt-3 inline-block rounded-full bg-emerald-500 px-6 py-2 text-sm font-extrabold uppercase tracking-wide text-white">
            {className}
          </span>
        </div>
      </div>

      {/* ── BACK ── */}
      <div className={`${CARD} flex flex-col`} style={{ background: YELLOW, height: 505 }}>
        <Squiggles />
        <div className="relative z-10"><Logo /></div>
        <p className="relative z-10 mt-3 text-center text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: `${INK}aa` }}>Student Details</p>

        <div className="relative z-10 mt-3 space-y-2">
          <Row label="Father's Name" value={student.fatherName} />
          <Row label="Mother's Name" value={student.motherName} />
          <Row label="Mobile Number" value={student.primaryContact} />
          <Row label="Date of Birth" value={student.dob ? formatDate(student.dob) : ""} />
          <Row label="Address" value={student.address} />
        </div>

        <div className="relative z-10 mt-auto flex flex-col items-center pt-4">
          <Qr />
          <p className="mt-1.5 text-[10px] font-semibold" style={{ color: `${INK}99` }}>{SCHOOL_NAME}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: `${INK}88` }}>{label}</p>
      <p className="break-words text-sm font-semibold" style={{ color: NAVY }}>{value || "—"}</p>
    </div>
  );
}
