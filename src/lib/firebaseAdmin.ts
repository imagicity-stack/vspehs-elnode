// ─────────────────────────────────────────────────────────────
// Firebase Admin SDK (server-only)
// ─────────────────────────────────────────────────────────────
// Used by protected API routes to create parent Auth accounts and verify
// the super admin's ID token. Requires a service account via env:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// (PRIVATE_KEY may contain literal "\n" sequences — they're normalised here.)
// Never import this from client components.
// ─────────────────────────────────────────────────────────────

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { isSuperAdminEmail } from "./firebase";

let app: App | null = null;

export function getAdminApp(): App | null {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;

  if (!app) {
    app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return app;
}

export function isAdminConfigured(): boolean {
  return getAdminApp() !== null;
}

/** The parts of a verified ID token these routes authorise against. */
export interface AdminCaller {
  email?: string | null;
  /** `role` custom claim, set server-side when the account was provisioned. */
  role?: unknown;
  uid?: string;
}

/** Why a caller was accepted or turned away — surfaced in the 403 body. */
export type AdminAuthResult =
  | { ok: true; via: "env-allowlist" | "role-claim" | "managed-admin" }
  | { ok: false; reason: string };

/**
 * Authorises a Super Admin caller. Three routes in, in order of cost:
 *
 *  1. the founder allowlist (`NEXT_PUBLIC_SUPERADMIN_EMAILS`);
 *  2. a verified `role: "superadmin"` custom claim — only an already-authorised
 *     admin can set one, and `verifyIdToken` has checked the signature, so this
 *     is the same authority `firestore.rules` already grants;
 *  3. a managed admin listed in `appConfig/superadmins`.
 *
 * Route 2 matters: an admin created in-app gets the claim but never appears in
 * the env allowlist, so without it they can open the admin portal and write to
 * Firestore yet be refused by every protected route — which is exactly the
 * 403 this used to produce.
 */
export async function authorizeAdmin(
  app: App,
  caller: AdminCaller | string | null | undefined,
): Promise<AdminAuthResult> {
  const c: AdminCaller = typeof caller === "string" || caller == null
    ? { email: caller ?? null }
    : caller;

  if (isSuperAdminEmail(c.email)) return { ok: true, via: "env-allowlist" };
  if (c.role === "superadmin") return { ok: true, via: "role-claim" };

  if (!c.email) {
    return { ok: false, reason: "The signed-in account has no email address and no Super Admin role." };
  }
  try {
    const snap = await getFirestore(app).collection("appConfig").doc("superadmins").get();
    const emails = (((snap.data()?.emails as string[]) ?? [])).map((e) => String(e).toLowerCase());
    if (emails.includes(c.email.toLowerCase())) return { ok: true, via: "managed-admin" };
  } catch {
    /* fall through to the refusal below */
  }
  return {
    ok: false,
    reason:
      `${c.email} is not a Super Admin. Add it to NEXT_PUBLIC_SUPERADMIN_EMAILS and redeploy, `
      + "list it in appConfig/superadmins in Firestore, or sign in with an account that has the "
      + "superadmin role.",
  };
}

/** Boolean form, kept for callers that only need yes/no. */
export async function isAuthorizedAdmin(
  app: App,
  caller: AdminCaller | string | null | undefined,
): Promise<boolean> {
  return (await authorizeAdmin(app, caller)).ok;
}
