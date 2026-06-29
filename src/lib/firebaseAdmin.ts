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
