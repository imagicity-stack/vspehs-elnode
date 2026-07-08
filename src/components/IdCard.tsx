"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Student } from "@/lib/types";
import { SCHOOL_NAME, SCHOOL_WEBSITE } from "@/lib/branding";
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

// QR — uses /public/qr.png (replace with your own).
function Qr() {
  const [ok, setOk] = useState(true);
  if (ok) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/qr.png" alt="QR code" onError={() => setOk(false)} className="h-[76px] w-[76px] object-contain" />;
  }
  return <div className="flex h-[76px] w-[76px] items-center justify-center rounded-lg border-2 border-dashed text-[10px]" style={{ borderColor: `${INK}66`, color: `${INK}88` }}>QR</div>;
}

// ── Playful hand-drawn style doodles (SVG, no emoji) ──────────
function Basketball({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="17" fill="#f97316" stroke="#7c2d12" strokeWidth="2" />
      <path d="M20 3v34M3 20h34M8 8c6 5 6 19 0 24M32 8c-6 5-6 19 0 24" fill="none" stroke="#7c2d12" strokeWidth="1.8" />
    </svg>
  );
}
function GradCap({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 40" className={className} aria-hidden>
      <path d="M22 6 3 15l19 9 19-9z" fill="#2b3a67" stroke="#141d38" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 20v9c0 3 22 3 22 0v-9" fill="#33477e" stroke="#141d38" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M41 15v9" stroke="#141d38" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="41" cy="25" r="2.4" fill="#f6ce46" stroke="#141d38" strokeWidth="1.2" />
    </svg>
  );
}
function Dino({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden>
      <path d="M6 30c0-9 6-16 15-16 3 0 4-4 8-4 2 0 3 1 3 3 4 1 8 4 8 9 0 2-1 3-3 3-1 4-5 7-10 7h-3l-1 5h-4l-1-5c-5 0-8-2-9-5H6z" fill="#5bbb6a" stroke="#2f6b3a" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18 14l3-5 2 5 3-5 2 5" fill="none" stroke="#2f6b3a" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="34" cy="22" r="1.8" fill="#173a1f" />
    </svg>
  );
}
function Books({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="6" y="24" width="28" height="9" rx="1.5" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.4" />
      <rect x="9" y="15" width="24" height="9" rx="1.5" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.4" />
      <rect x="7" y="6" width="26" height="9" rx="1.5" fill="#22c55e" stroke="#166534" strokeWidth="1.4" />
      <path d="M13 6v9M27 15v9M17 24v9" stroke="#00000030" strokeWidth="1.2" />
    </svg>
  );
}
function Trophy({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 44" className={className} aria-hidden>
      <path d="M11 5h18v9a9 9 0 0 1-18 0z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 7H6v3a5 5 0 0 0 5 5M29 7h5v3a5 5 0 0 1-5 5" fill="none" stroke="#b45309" strokeWidth="1.6" />
      <path d="M18 23h4v6h-4z" fill="#f59e0b" stroke="#b45309" strokeWidth="1.4" />
      <rect x="12" y="29" width="16" height="6" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.6" />
    </svg>
  );
}
function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 3l4 8 9 1-6.5 6 1.6 9L16 29l-8.1 4 1.6-9L3 12l9-1z" fill="#fde047" stroke="#a16207" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
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

// Decorative scalloped "ground" that fills the lower area of the front.
function BottomArt() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden>
      <path d="M0 40 q20 -18 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V64 H0Z" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}

const CARD = "idcard relative w-[320px] shrink-0 overflow-hidden rounded-[22px] p-5";

export function IdCard({ student, className }: { student: Student; className: string }) {
  const initial = (student.firstName || "?").charAt(0).toUpperCase();
  return (
    <div className="idcard-pair flex flex-wrap gap-4">
      {/* ── FRONT ── */}
      <div className="idcard-page">
        <div className={`${CARD} flex flex-col items-center text-center`} style={{ background: YELLOW, height: 505 }}>
          <Squiggles />
          <BottomArt />
          {/* SVG doodle stickers */}
          <Basketball className="pointer-events-none absolute left-2 top-16 h-9 w-9 -rotate-12" />
          <GradCap className="pointer-events-none absolute right-2 top-14 h-9 w-10 rotate-12" />
          <Dino className="pointer-events-none absolute right-3 top-40 h-9 w-11 rotate-6" />
          <Books className="pointer-events-none absolute bottom-6 left-2 h-9 w-9 -rotate-6" />
          <Trophy className="pointer-events-none absolute bottom-6 right-3 h-10 w-9 rotate-6" />
          <Star className="pointer-events-none absolute left-5 top-10 h-5 w-5" />

          <div className="relative z-10 w-full"><Logo /></div>

          {/* Photo + name as one centered group — no big gap */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <div className="h-[184px] w-[184px] rounded-full bg-white p-1.5 shadow-md">
              {student.photoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={student.photoUrl} alt={student.firstName} className="h-full w-full rounded-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-5xl font-extrabold text-slate-300">{initial}</div>}
            </div>
            <h3 className="mt-3 text-2xl font-extrabold uppercase leading-tight tracking-wide" style={{ color: NAVY }}>
              {student.firstName} {student.lastName}
            </h3>
            <p className="mt-1 text-sm font-semibold" style={{ color: `${INK}cc` }}>Sc No. : {student.admissionNo}</p>
          </div>

          <span className="relative z-10 mb-1 inline-block rounded-full bg-emerald-500 px-6 py-2 text-sm font-extrabold uppercase tracking-wide text-white">
            {className}
          </span>
        </div>
      </div>

      {/* ── BACK ── */}
      <div className="idcard-page">
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
            <p className="mt-1.5 text-[11px] font-bold tracking-wide" style={{ color: NAVY }}>{SCHOOL_WEBSITE}</p>
          </div>
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
