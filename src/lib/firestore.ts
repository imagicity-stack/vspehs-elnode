// ─────────────────────────────────────────────────────────────
// Firestore production helpers
// ─────────────────────────────────────────────────────────────
// Generic CRUD wrappers + a one-shot seeding routine for connecting a real
// Firebase project. These are intentionally thin — the UI consumes data via
// the React store (src/lib/store.tsx). To go fully live, hydrate the store
// from `fetchCollection` on mount and route mutators through `upsertDoc`.
//
// Run `seedFirestore()` once (e.g. from a protected admin action) to push the
// demo dataset into Firestore so a fresh project is immediately usable.
// ─────────────────────────────────────────────────────────────

import {
  collection, doc, getDocs, setDoc, deleteDoc, writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import * as seed from "./mockData";

export async function fetchCollection<T>(name: string): Promise<T[]> {
  if (!db) throw new Error("Firestore not configured");
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export async function upsertDoc<T extends { id: string }>(name: string, value: T) {
  if (!db) throw new Error("Firestore not configured");
  await setDoc(doc(db, name, value.id), value, { merge: true });
}

export async function removeDoc(name: string, id: string) {
  if (!db) throw new Error("Firestore not configured");
  await deleteDoc(doc(db, name, id));
}

const COLLECTIONS: Record<string, unknown[]> = {
  classes: seed.classes,
  staff: seed.staff,
  students: seed.students,
  feeHeads: seed.feeHeads,
  invoices: seed.invoices,
  payments: seed.payments,
  concessions: seed.concessions,
  attendance: seed.attendance,
  staffAttendance: seed.staffAttendance,
  dailyUpdates: seed.dailyUpdates,
  homework: seed.homework,
  circulars: seed.circulars,
  events: seed.events,
  exams: seed.exams,
  examResults: seed.examResults,
  leaveRequests: seed.leaveRequests,
  taskItems: seed.taskItems,
};

/** Push the demo dataset to Firestore (idempotent by document id). */
export async function seedFirestore() {
  if (!isFirebaseConfigured || !db) throw new Error("Configure Firebase before seeding.");
  for (const [name, items] of Object.entries(COLLECTIONS)) {
    const batch = writeBatch(db);
    for (const item of items as { id: string }[]) {
      batch.set(doc(db, name, item.id), item as Record<string, unknown>);
    }
    await batch.commit();
  }
}
