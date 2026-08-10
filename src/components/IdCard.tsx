"use client";

import { Student } from "@/lib/types";
import { SCHOOL_WEBSITE } from "@/lib/branding";
import { formatDate } from "@/lib/utils";
import {
  YELLOW, NAVY, INK, CARD, CARD_HEIGHT,
  Logo, Qr, Squiggles, BottomArt, Basketball, GradCap, Dino, Books, Trophy, Star, Row,
} from "@/components/id-card-parts";

export function IdCard({ student, className }: { student: Student; className: string }) {
  const initial = (student.firstName || "?").charAt(0).toUpperCase();
  return (
    <div className="idcard-pair flex flex-wrap gap-4">
      {/* ── FRONT ── */}
      <div className="idcard-page">
        <div className={`${CARD} flex flex-col items-center text-center`} style={{ background: YELLOW, height: CARD_HEIGHT }}>
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
        <div className={`${CARD} flex flex-col`} style={{ background: YELLOW, height: CARD_HEIGHT }}>
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
