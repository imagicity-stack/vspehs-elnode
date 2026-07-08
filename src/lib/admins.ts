// ─────────────────────────────────────────────────────────────
// Super Admin allowlist — managed in-app (Firestore) on top of the
// env-configured founder list. Lets the founder add/remove Google admins
// without a redeploy. Stored at appConfig/superadmins { emails: string[] }.
// ─────────────────────────────────────────────────────────────

import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db, isSuperAdminEmail } from "./firebase";

const norm = (e: string) => e.trim().toLowerCase();

function ref() {
  if (!db) throw new Error("Firestore not configured");
  return doc(db, "appConfig", "superadmins");
}

/** Managed admin emails from Firestore (lowercased). */
export async function fetchManagedAdmins(): Promise<string[]> {
  if (!db) return [];
  try {
    const snap = await getDoc(ref());
    return (((snap.data()?.emails as string[]) ?? []).map(norm));
  } catch {
    return [];
  }
}

/** Live subscription to the managed admin list. */
export function subscribeManagedAdmins(cb: (emails: string[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    ref(),
    (snap) => cb(((snap.data()?.emails as string[]) ?? []).map(norm)),
    () => cb([]),
  );
}

/** Replace the managed admin list (deduped, lowercased). */
export async function setManagedAdmins(emails: string[]): Promise<void> {
  const unique = Array.from(new Set(emails.map(norm))).filter(Boolean);
  await setDoc(ref(), { emails: unique }, { merge: true });
}

/** True when the email is a founder (env) or a managed admin (Firestore). */
export async function isAllowedAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  if (isSuperAdminEmail(email)) return true;
  return (await fetchManagedAdmins()).includes(norm(email));
}
