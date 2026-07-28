"use client";

// ─────────────────────────────────────────────────────────────
// Data health banner
// ─────────────────────────────────────────────────────────────
// When a Firestore read fails, the collection simply stays empty — so a
// permission error, a wrong project/database or an undeployed ruleset all look
// exactly like "the school has no data yet" (₹0 tiles, "No invoices match").
// This banner makes that failure visible, names the collections, and points at
// the fix. It renders nothing when every read the current role is entitled to
// has succeeded.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useData, STAFF_ONLY_KEYS } from "@/lib/store";
import { isDemoMode, FIREBASE_PROJECT_ID, FIREBASE_DATABASE_ID } from "@/lib/firebase";
import { AlertTriangle } from "lucide-react";

const HINTS: Record<string, string> = {
  "permission-denied":
    "Firestore rules are blocking the read. Deploy the rules in firestore.rules (firebase deploy --only firestore:rules).",
  unauthenticated: "The Firebase session expired. Sign out and sign in again.",
  "failed-precondition":
    `The app is reading database "${FIREBASE_DATABASE_ID}" in project "${FIREBASE_PROJECT_ID}". If your data lives in a different database, set NEXT_PUBLIC_FIREBASE_DATABASE_ID and redeploy.`,
  unavailable: "Firestore was unreachable — check the network and reload.",
};

export function DataHealthBanner() {
  const { user } = useAuth();
  const { health } = useData();

  if (isDemoMode || !user) return null;

  // A parent is *meant* to be denied the staff-only collections; only report
  // failures for collections this role is entitled to read.
  const staffOnly = STAFF_ONLY_KEYS as string[];
  const failed = Object.entries(health).filter(
    ([key, h]) => h.state === "error" && (user.role !== "parent" || !staffOnly.includes(key)),
  );
  if (failed.length === 0) return null;

  const codes = Array.from(new Set(failed.map(([, h]) => h.code).filter(Boolean))) as string[];
  const hint = codes.map((c) => HINTS[c]).find(Boolean) ?? failed[0][1].message;

  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 sm:px-6">
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="min-w-0">
          <strong>Couldn&apos;t load {failed.map(([k]) => k).join(", ")} from Firestore.</strong>{" "}
          These screens will look empty even though the records exist.
          {codes.length > 0 && <> ({codes.join(", ")})</>} {hint}
        </p>
      </div>
      {user.role === "superadmin" && (
        <Link href="/admin/settings" className="shrink-0 font-semibold text-rose-900 hover:underline">
          Run diagnostics →
        </Link>
      )}
    </div>
  );
}
