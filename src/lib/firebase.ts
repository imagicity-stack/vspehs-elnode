// ─────────────────────────────────────────────────────────────
// Firebase initialisation
// ─────────────────────────────────────────────────────────────
// If the required NEXT_PUBLIC_FIREBASE_* env vars are present we initialise
// the real Firebase app; otherwise the app falls back to DEMO MODE using the
// seeded dataset in `mockData.ts`. This keeps preview deployments zero-config.
// ─────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

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

/** Config values surfaced (read-only) for the in-app diagnostics panel. */
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId ?? "";
export const FIREBASE_AUTH_DOMAIN = firebaseConfig.authDomain ?? "";
/** Which NEXT_PUBLIC_FIREBASE_* keys are missing — empty array means all present. */
export const MISSING_FIREBASE_KEYS = (
  [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
  ] as const
)
  .filter(([, v]) => !v)
  .map(([k]) => k);

/** Domain used to synthesise a parent's email from their 7-digit number. */
export const PARENT_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_PARENT_EMAIL_DOMAIN || "parents.el-node.app";

/**
 * Initial password assigned to every newly-created login (parents and staff).
 * Users change it from "Change password" in their portal. Configurable via env.
 */
export const DEFAULT_PASSWORD =
  process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || "password123";

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
  process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS || "dewesh@eldenheights.org,contact.vsp@eldenheights.org"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdminEmail(email?: string | null): boolean {
  return !!email && SUPERADMIN_EMAILS.includes(email.toLowerCase());
}

/** True when a Storage bucket is configured (student photo uploads). */
export const isStorageConfigured = Boolean(
  isFirebaseConfigured && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Use the named database when provided, otherwise the project default.
  const useNamed = Boolean(FIREBASE_DATABASE_ID && FIREBASE_DATABASE_ID !== "(default)");
  // `ignoreUndefinedProperties` lets us write records that carry optional
  // (possibly undefined) fields without Firestore throwing. `initializeFirestore`
  // must run before any `getFirestore`, and throws if already initialised
  // (e.g. on Next.js fast-refresh) — fall back to the existing instance.
  const settings = { ignoreUndefinedProperties: true };
  try {
    db = useNamed
      ? initializeFirestore(app, settings, FIREBASE_DATABASE_ID)
      : initializeFirestore(app, settings);
  } catch {
    db = useNamed ? getFirestore(app, FIREBASE_DATABASE_ID) : getFirestore(app);
  }
  if (isStorageConfigured) storage = getStorage(app);
}

if (typeof window !== "undefined") {
  // One-line confirmation in the browser console so it's obvious which mode the
  // built bundle is running in (NEXT_PUBLIC_* vars are inlined at build time).
  console.info(
    isFirebaseConfigured
      ? `[El-Node] Firebase mode · project "${FIREBASE_PROJECT_ID}" · db "${FIREBASE_DATABASE_ID}"`
      : "[El-Node] DEMO mode — no Firebase env vars in this build. Data stays in localStorage only.",
  );
}

export { app, auth, db, storage };
