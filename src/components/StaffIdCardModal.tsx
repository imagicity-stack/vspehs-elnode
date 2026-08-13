"use client";

// ─────────────────────────────────────────────────────────────
// Staff ID card generation modal
// ─────────────────────────────────────────────────────────────
// Preview, configure and print staff identity cards for one person or a whole
// selection. Printing reuses the isolated card portal that the student ID card
// page uses, so the output is CR80-sized with no app chrome around it.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Staff } from "@/lib/types";
import { StaffIdCard, designationOf } from "@/components/StaffIdCard";
import { formatDate } from "@/lib/utils";
import { X, Printer, CreditCard, AlertTriangle, Layers } from "lucide-react";

/** 31 March of the current academic session — the usual expiry for a staff card. */
function sessionEnd(now = new Date()) {
  const endYear = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
  return `${endYear}-03-31`;
}

/** Fields that leave a visible gap on the printed card when they're missing. */
function missingFields(s: Staff) {
  const gaps: string[] = [];
  if (!s.photoUrl) gaps.push("photo");
  if (!s.bloodGroup || s.bloodGroup === "Unknown") gaps.push("blood group");
  if (!s.phone) gaps.push("phone");
  if (!s.dob || s.dob === "1990-01-01") gaps.push("date of birth");
  if (!s.address || s.address === "—") gaps.push("address");
  if (!s.emergencyContact && !s.emergencyPhone) gaps.push("emergency contact");
  return gaps;
}

export function StaffIdCardModal({
  staff, onClose,
}: {
  /** A single staff member, or a batch to print together. */
  staff: Staff | Staff[];
  onClose: () => void;
}) {
  const list = useMemo(() => (Array.isArray(staff) ? staff : [staff]), [staff]);
  const [faces, setFaces] = useState<"both" | "front" | "back">("both");
  const [showValidity, setShowValidity] = useState(true);
  const [validTill, setValidTill] = useState(sessionEnd);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Escape closes; the body class is cleared once the print dialog is dismissed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const clear = () => document.body.classList.remove("printing-cards");
    window.addEventListener("keydown", onKey);
    window.addEventListener("afterprint", clear);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("afterprint", clear);
      clear();
    };
  }, [onClose]);

  const print = () => {
    document.body.classList.add("printing-cards");
    setTimeout(() => window.print(), 50);
  };

  const preview = list[0];
  const gaps = list.length === 1 ? missingFields(preview) : [];
  const stamp = showValidity ? validTill : undefined;
  const pages = list.length * (faces === "both" ? 2 : 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2 text-violet-600"><CreditCard className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-slate-900">Staff ID Card</h3>
              <p className="text-sm text-slate-500">
                {list.length === 1
                  ? `${preview.name} · ${designationOf(preview)}`
                  : `${list.length} staff members selected`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 lg:flex-row">
          {/* Options */}
          <div className="w-full shrink-0 space-y-4 lg:w-64">
            <div>
              <label className="label">Print</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["both", "Front & back"],
                  ["front", "Front only"],
                  ["back", "Back only"],
                ] as const).map(([key, text]) => (
                  <button
                    key={key}
                    onClick={() => setFaces(key)}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                      faces === key
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label flex items-center justify-between">
                <span>Valid till</span>
                <input
                  type="checkbox"
                  checked={showValidity}
                  onChange={(e) => setShowValidity(e.target.checked)}
                  className="h-3.5 w-3.5 accent-brand-600"
                />
              </label>
              <input
                type="date"
                value={validTill}
                disabled={!showValidity}
                onChange={(e) => setValidTill(e.target.value)}
                className="input disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                Printed on the back. Defaults to the end of the academic session.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              <p className="flex items-center gap-1.5 font-semibold text-slate-600">
                <Layers className="h-3.5 w-3.5" /> {pages} page{pages === 1 ? "" : "s"}
              </p>
              <p className="mt-1">Each page prints at CR80 card size (54 × 85.6 mm).</p>
            </div>

            {gaps.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Missing {gaps.join(", ")}. The card still prints — add the details from
                  <strong> Edit staff</strong> for a complete card.
                </span>
              </div>
            )}

            <button onClick={print} className="btn-primary w-full py-3">
              <Printer className="h-4 w-4" /> Download / Print
            </button>
          </div>

          {/* Preview */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap justify-center gap-4 rounded-2xl bg-slate-50 p-4">
              <StaffIdCard staff={preview} validTill={stamp} faces={faces} />
            </div>
            {list.length > 1 && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Previewing {preview.name} · {list.length - 1} more card
                {list.length - 1 === 1 ? "" : "s"} will be printed
              </p>
            )}
            {stamp && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Valid till {formatDate(stamp)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Isolated print portal — card-sized pages, no app chrome */}
      {mounted && createPortal(
        <div className="print-cards-portal">
          {list.map((s) => (
            <StaffIdCard key={s.id} staff={s} validTill={stamp} faces={faces} />
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
