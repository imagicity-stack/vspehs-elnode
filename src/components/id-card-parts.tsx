"use client";

// ─────────────────────────────────────────────────────────────
// Shared ID-card furniture
// ─────────────────────────────────────────────────────────────
// The palette, logo/QR marks, doodles and detail row used by both the student
// card (<IdCard>) and the staff card (<StaffIdCard>), so the two stay visually
// identical as the design evolves.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { SCHOOL_NAME } from "@/lib/branding";

export const YELLOW = "#f6ce46";
export const NAVY = "#1f2d5a";
export const INK = "#3a2a00";

/** Authored width of a card face; print CSS scales it to CR80. */
export const CARD = "idcard relative w-[320px] shrink-0 overflow-hidden rounded-[22px] p-5";
export const CARD_HEIGHT = 505;

// School logo — uses /public/logo_black.png when present, else a text mark.
export function Logo({ className = "" }: { className?: string }) {
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
export function Qr({ size = 76 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/qr.png" alt="QR code" onError={() => setOk(false)} style={{ height: size, width: size }} className="object-contain" />;
  }
  return (
    <div
      className="flex items-center justify-center rounded-lg border-2 border-dashed text-[10px]"
      style={{ height: size, width: size, borderColor: `${INK}66`, color: `${INK}88` }}
    >
      QR
    </div>
  );
}

// ── Playful hand-drawn style doodles (SVG, no emoji) ──────────
export function Basketball({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="17" fill="#f97316" stroke="#7c2d12" strokeWidth="2" />
      <path d="M20 3v34M3 20h34M8 8c6 5 6 19 0 24M32 8c-6 5-6 19 0 24" fill="none" stroke="#7c2d12" strokeWidth="1.8" />
    </svg>
  );
}
export function GradCap({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 40" className={className} aria-hidden>
      <path d="M22 6 3 15l19 9 19-9z" fill="#2b3a67" stroke="#141d38" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 20v9c0 3 22 3 22 0v-9" fill="#33477e" stroke="#141d38" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M41 15v9" stroke="#141d38" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="41" cy="25" r="2.4" fill="#f6ce46" stroke="#141d38" strokeWidth="1.2" />
    </svg>
  );
}
export function Dino({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden>
      <path d="M6 30c0-9 6-16 15-16 3 0 4-4 8-4 2 0 3 1 3 3 4 1 8 4 8 9 0 2-1 3-3 3-1 4-5 7-10 7h-3l-1 5h-4l-1-5c-5 0-8-2-9-5H6z" fill="#5bbb6a" stroke="#2f6b3a" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18 14l3-5 2 5 3-5 2 5" fill="none" stroke="#2f6b3a" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="34" cy="22" r="1.8" fill="#173a1f" />
    </svg>
  );
}
export function Books({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="6" y="24" width="28" height="9" rx="1.5" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.4" />
      <rect x="9" y="15" width="24" height="9" rx="1.5" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.4" />
      <rect x="7" y="6" width="26" height="9" rx="1.5" fill="#22c55e" stroke="#166534" strokeWidth="1.4" />
      <path d="M13 6v9M27 15v9M17 24v9" stroke="#00000030" strokeWidth="1.2" />
    </svg>
  );
}
export function Trophy({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 44" className={className} aria-hidden>
      <path d="M11 5h18v9a9 9 0 0 1-18 0z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 7H6v3a5 5 0 0 0 5 5M29 7h5v3a5 5 0 0 1-5 5" fill="none" stroke="#b45309" strokeWidth="1.6" />
      <path d="M18 23h4v6h-4z" fill="#f59e0b" stroke="#b45309" strokeWidth="1.4" />
      <rect x="12" y="29" width="16" height="6" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.6" />
    </svg>
  );
}
export function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 3l4 8 9 1-6.5 6 1.6 9L16 29l-8.1 4 1.6-9L3 12l9-1z" fill="#fde047" stroke="#a16207" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
export function Pencil({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M8 32l2-7L27 8l5 5L15 30z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M27 8l5 5" stroke="#92400e" strokeWidth="1.6" />
      <path d="M8 32l5-2-3-3z" fill="#4b5563" stroke="#1f2937" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
export function AppleFruit({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 40" className={className} aria-hidden>
      <path d="M18 12c-3-3-9-3-11 2-2 5 1 14 5 18 2 2 4 1 6 1s4 1 6-1c4-4 7-13 5-18-2-5-8-5-11-2z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18 12V6" stroke="#4d2600" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 8c3-4 7-3 7-3s0 5-5 5z" fill="#22c55e" stroke="#166534" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function Squiggles() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <path d="M-10 40 q30 -30 60 0 t60 0" fill="none" stroke="#eab308" strokeWidth="7" strokeLinecap="round" opacity="0.5" />
      <path d="M240 470 q30 -28 58 -2" fill="none" stroke="#eab308" strokeWidth="7" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// Decorative scalloped "ground" that fills the lower area of the front.
export function BottomArt() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden>
      <path d="M0 40 q20 -18 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V64 H0Z" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}

/**
 * Labelled detail row used on the back of both cards. `compact` tightens it so
 * a card carrying more fields still leaves room for the QR footer.
 */
export function Row({ label, value, compact }: { label: string; value?: string; compact?: boolean }) {
  return (
    <div className={`rounded-xl bg-white/70 px-3 ${compact ? "py-1.5" : "py-2"}`}>
      <p className={`font-bold uppercase tracking-wide ${compact ? "text-[9px]" : "text-[10px]"}`} style={{ color: `${INK}88` }}>{label}</p>
      <p className={`break-words font-semibold ${compact ? "text-[13px] leading-tight" : "text-sm"}`} style={{ color: NAVY }}>{value || "—"}</p>
    </div>
  );
}
