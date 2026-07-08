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

/**
 * Authorises a Super Admin caller: a founder (env allowlist) or a managed
 * admin (appConfig/superadmins in Firestore). Used by protected API routes so
 * admins added in-app work without a redeploy.
 */
export async function isAuthorizedAdmin(app: App, email?: string | null): Promise<boolean> {
  if (isSuperAdminEmail(email)) return true;
  if (!email) return false;
  try {
    const snap = await getFirestore(app).collection("appConfig").doc("superadmins").get();
    const emails = (((snap.data()?.emails as string[]) ?? [])).map((e) => String(e).toLowerCase());
    return emails.includes(email.toLowerCase());
  } catch {
    return false;
  }
}
