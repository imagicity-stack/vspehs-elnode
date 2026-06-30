// ─────────────────────────────────────────────────────────────
// Firestore production helpers
// ─────────────────────────────────────────────────────────────
// Generic CRUD wrappers for reading and writing Firestore documents.
// The UI consumes data via the React store (src/lib/store.tsx).
// To go fully live, hydrate the store from `fetchCollection` on mount
// and route mutators through `upsertDoc`.
// ─────────────────────────────────────────────────────────────

import {
  collection, doc, getDocs, setDoc, deleteDoc, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export async function fetchCollection<T>(name: string): Promise<T[]> {
  if (!db) throw new Error("Firestore not configured");
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

/**
 * Live-subscribe to a collection. `onData` fires on every change (including the
 * initial load); `onError` fires once if the read is denied/unavailable.
 * Returns an unsubscribe function.
 */
export function subscribeCollection<T>(
  name: string,
  onData: (rows: T[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!db) {
    onError?.(new Error("Firestore not configured"));
    return () => {};
  }
  return onSnapshot(
    collection(db, name),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
    (err) => onError?.(err),
  );
}

export async function upsertDoc<T extends { id: string }>(name: string, value: T) {
  if (!db) throw new Error("Firestore not configured");
  await setDoc(doc(db, name, value.id), value, { merge: true });
}

export async function removeDoc(name: string, id: string) {
  if (!db) throw new Error("Firestore not configured");
  await deleteDoc(doc(db, name, id));
}
