"use client";

// ─────────────────────────────────────────────────────────────
// Staff identity card
// ─────────────────────────────────────────────────────────────
// The staff counterpart to <IdCard>. Same size, palette and print classes as
// the student card so a mixed print run comes out on identical stock — with a
// navy "Staff" ribbon, designation pill and staff-specific details on the back.
// ─────────────────────────────────────────────────────────────

import { Staff, StaffRole } from "@/lib/types";
import { SCHOOL_WEBSITE } from "@/lib/branding";
import { formatDate, initials } from "@/lib/utils";
import {
  YELLOW, NAVY, INK, CARD, CARD_HEIGHT,
  Logo, Qr, Squiggles, BottomArt, Books, Star, Trophy, Pencil, AppleFruit, Row,
} from "@/components/id-card-parts";

/** How a role reads on a printed card. */
export const roleTitle: Record<StaffRole, string> = {
  teacher: "Teacher",
  accountant: "Accountant",
  superadmin: "Administrator",
  helper: "Support Staff",
};

export const designationOf = (s: Staff) => s.designation?.trim() || roleTitle[s.role];

/** Half-width detail cell, so the back can carry more fields than the student card. */
function MiniRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: `${INK}88` }}>{label}</p>
      <p className="truncate text-[13px] font-semibold leading-tight" style={{ color: NAVY }}>{value || "—"}</p>
    </div>
  );
}

export function StaffIdCard({
  staff, validTill, faces = "both",
}: {
  staff: Staff;
  /** Optional expiry printed on the back, ISO date. */
  validTill?: string;
  faces?: "both" | "front" | "back";
}) {
  const designation = designationOf(staff);

  const front = (
    <div className="idcard-page">
      <div className={`${CARD} flex flex-col items-center text-center`} style={{ background: YELLOW, height: CARD_HEIGHT }}>
        <Squiggles />
        <BottomArt />
        {/* SVG doodle stickers */}
        <Pencil className="pointer-events-none absolute left-2 top-16 h-9 w-9 -rotate-12" />
        <AppleFruit className="pointer-events-none absolute right-3 top-40 h-9 w-8 rotate-6" />
        <Books className="pointer-events-none absolute bottom-6 left-2 h-9 w-9 -rotate-6" />
        <Trophy className="pointer-events-none absolute bottom-6 right-3 h-10 w-9 rotate-6" />
        <Star className="pointer-events-none absolute left-5 top-10 h-5 w-5" />

        {/* Blood group sits on the front where it's useful in an emergency. */}
        {staff.bloodGroup && staff.bloodGroup !== "Unknown" && (
          <span
            className="absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white"
            style={{ background: "#e11d48" }}
          >
            {staff.bloodGroup}
          </span>
        )}

        <div className="relative z-10 w-full"><Logo /></div>

        <span
          className="relative z-10 mt-2 inline-block rounded-full px-4 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-white"
          style={{ background: NAVY }}
        >
          Staff
        </span>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
          <div className="h-[166px] w-[166px] rounded-full bg-white p-1.5 shadow-md" style={{ outline: `3px solid ${NAVY}`, outlineOffset: 2 }}>
            {staff.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={staff.photoUrl} alt={staff.name} className="h-full w-full rounded-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-4xl font-extrabold text-slate-300">{initials(staff.name) || "?"}</div>}
          </div>
          <h3 className="mt-3 text-xl font-extrabold uppercase leading-tight tracking-wide" style={{ color: NAVY }}>
            {staff.name}
          </h3>
          <p className="mt-1 text-sm font-semibold" style={{ color: `${INK}cc` }}>ID No. : {staff.staffCode}</p>
        </div>

        <span
          className="relative z-10 mb-1 inline-block rounded-full px-6 py-2 text-sm font-extrabold uppercase tracking-wide text-white"
          style={{ background: NAVY }}
        >
          {designation}
        </span>
      </div>
    </div>
  );

  const back = (
    <div className="idcard-page">
      <div className={`${CARD} flex flex-col`} style={{ background: YELLOW, height: CARD_HEIGHT }}>
        <Squiggles />
        <div className="relative z-10"><Logo /></div>
        <p className="relative z-10 mt-3 text-center text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: `${INK}aa` }}>Staff Details</p>

        {/* min-h-0 + overflow-hidden: a long address clips inside this block
            instead of pushing the QR footer off the fixed-height card. */}
        <div className="relative z-10 mt-3 min-h-0 flex-1 space-y-1.5 overflow-hidden">
          <div className="grid grid-cols-2 gap-1.5">
            <MiniRow label="Staff ID" value={staff.staffCode} />
            <MiniRow label="Blood Group" value={staff.bloodGroup && staff.bloodGroup !== "Unknown" ? staff.bloodGroup : ""} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <MiniRow label="Date of Birth" value={staff.dob ? formatDate(staff.dob) : ""} />
            <MiniRow label="Joined" value={staff.joiningDate ? formatDate(staff.joiningDate) : ""} />
          </div>
          <Row compact label="Mobile Number" value={staff.phone} />
          <Row
            compact
            label="Emergency Contact"
            value={[staff.emergencyContact, staff.emergencyPhone].filter(Boolean).join(" · ")}
          />
          <Row compact label="Address" value={staff.address && staff.address !== "—" ? staff.address : ""} />
        </div>

        <div className="relative z-10 flex shrink-0 flex-col items-center pt-2.5">
          {validTill && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: `${INK}aa` }}>
              Valid till {formatDate(validTill)}
            </p>
          )}
          <Qr size={64} />
          <p className="mt-1 text-[11px] font-bold tracking-wide" style={{ color: NAVY }}>{SCHOOL_WEBSITE}</p>
          <p className="mt-0.5 text-center text-[8px] font-medium leading-tight" style={{ color: `${INK}99` }}>
            If found, please return this card to the school office.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="idcard-pair flex flex-wrap gap-4">
      {faces !== "back" && front}
      {faces !== "front" && back}
    </div>
  );
}
