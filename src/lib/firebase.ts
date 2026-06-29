// ─────────────────────────────────────────────────────────────
// Firebase initialisation
// ─────────────────────────────────────────────────────────────
// If the required NEXT_PUBLIC_FIREBASE_* env vars are present we initialise
// the real Firebase app; otherwise the app falls back to DEMO MODE using the
// seeded dataset in `mockData.ts`. This keeps preview deployments zero-config.
// ─────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/** True when Firebase credentials are configured. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

/** True when running without a backend (seeded demo data). */
export const isDemoMode = !isFirebaseConfigured;

/** Domain used to synthesise a parent's email from their 7-digit number. */
export const PARENT_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_PARENT_EMAIL_DOMAIN || "parents.el-node.app";

/**
 * Firestore database id. Firebase projects can host multiple named databases;
 * leave unset (or "(default)") to use the project's default database.
 */
export const FIREBASE_DATABASE_ID =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "(default)";

export function admissionNoToEmail(admissionNo: string): string {
  return `${admissionNo}@${PARENT_EMAIL_DOMAIN}`;
}

/**
 * Emails allowed to sign in as Super Admin via Google. Comma-separated.
 * Defaults to the founding administrator.
 */
export const SUPERADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS || "dewesh@eldenheights.org"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdminEmail(email?: string | null): boolean {
  return !!email && SUPERADMIN_EMAILS.includes(email.toLowerCase());
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Use the named database when provided, otherwise the project default.
  db = FIREBASE_DATABASE_ID && FIREBASE_DATABASE_ID !== "(default)"
    ? getFirestore(app, FIREBASE_DATABASE_ID)
    : getFirestore(app);
}

export { app, auth, db };
