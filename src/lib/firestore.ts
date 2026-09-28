// ─────────────────────────────────────────────────────────────
// Firestore production helpers
// ─────────────────────────────────────────────────────────────
// Generic CRUD wrappers for reading and writing Firestore documents.
// The UI consumes data via the React store (src/lib/store.tsx).
// To go fully live, hydrate the store from `fetchCollection` on mount
// and route mutators through `upsertDoc`.
// ─────────────────────────────────────────────────────────────

import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, query,
  writeBatch, type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

export type { QueryConstraint };

export async function fetchCollection<T>(name: string): Promise<T[]> {
  if (!db) throw new Error("Firestore not configured");
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

/**
 * Live-subscribe to a collection. `onData` fires on every change (including the
 * initial load); `onError` fires once if the read is denied/unavailable.
 * Returns an unsubscribe function.
 *
 * `constraints` narrows the listen. This matters for security, not just
 * bandwidth: rules that allow a parent only their own children's documents
 * reject an unfiltered collection listen outright, so the query has to carry
 * the same restriction the rule enforces.
 */
export function subscribeCollection<T>(
  name: string,
  onData: (rows: T[]) => void,
  onError?: (e: Error) => void,
  constraints: QueryConstraint[] = [],
): () => void {
  if (!db) {
    onError?.(new Error("Firestore not configured"));
    return () => {};
  }
  const ref = constraints.length
    ? query(collection(db, name), ...constraints)
    : collection(db, name);
  return onSnapshot(
    ref,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
    (err) => onError?.(err),
  );
}

export async function upsertDoc<T extends { id: string }>(name: string, value: T) {
  if (!db) throw new Error("Firestore not configured");
  await setDoc(doc(db, name, value.id), value, { merge: true });
}

/**
 * Write many documents in one atomic batch. Publishing a result set writes one
 * document per student; doing that document-by-document can leave a class half
 * published if the tab closes mid-run.
 */
export async function upsertMany<T extends { id: string }>(name: string, values: T[]) {
  if (!db) throw new Error("Firestore not configured");
  // Firestore caps a batch at 500 operations.
  for (let i = 0; i < values.length; i += 450) {
    const batch = writeBatch(db);
    for (const v of values.slice(i, i + 450)) {
      batch.set(doc(db, name, v.id), v, { merge: true });
    }
    await batch.commit();
  }
}

export async function removeDoc(name: string, id: string) {
  if (!db) throw new Error("Firestore not configured");
  await deleteDoc(doc(db, name, id));
}

export async function removeMany(name: string, ids: string[]) {
  if (!db) throw new Error("Firestore not configured");
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + 450)) batch.delete(doc(db, name, id));
    await batch.commit();
  }
}

/** Reads one document, or null when it is missing. */
export async function fetchDoc<T>(name: string, id: string): Promise<T | null> {
  if (!db) throw new Error("Firestore not configured");
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}
