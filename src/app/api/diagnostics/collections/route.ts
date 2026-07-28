import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAdminApp, isAuthorizedAdmin } from "@/lib/firebaseAdmin";
import { FIREBASE_DATABASE_ID } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Firestore scan (Super Admin only)
// ─────────────────────────────────────────────────────────────
// Answers "the records are in Firestore but the ERP shows nothing".
//
// The browser SDK cannot enumerate collections, and `firestore.rules` only
// grants reads on the exact paths the app knows about — so data stored under
// any other collection name, or in another database, is invisible to the client
// with no error to show for it. The Admin SDK bypasses rules and CAN enumerate,
// so this route reports the real contents: every root collection with its
// document count, in every database the app might be pointed at.
// ─────────────────────────────────────────────────────────────

/** Collection names the app subscribes to (keep in sync with COLLECTION_KEYS). */
const EXPECTED = [
  "subjects", "classes", "staff", "students", "feeHeads", "invoices", "payments",
  "concessions", "attendance", "staffAttendance", "dailyUpdates", "homework",
  "circulars", "events", "exams", "examResults", "leaveRequests", "taskItems",
];

interface CollectionInfo {
  name: string;
  count: number;
  /** Field names of one document — reveals a shape mismatch. */
  sampleFields?: string[];
  sampleId?: string;
  /** Subcollections hanging off that document (nested finance data). */
  subcollections?: string[];
}

async function scan(db: Firestore): Promise<CollectionInfo[]> {
  const cols = await db.listCollections();
  return Promise.all(
    cols.map(async (col): Promise<CollectionInfo> => {
      let count = 0;
      try {
        count = (await col.count().get()).data().count;
      } catch {
        // count() needs a recent Firestore backend — fall back to a bounded read.
        count = (await col.limit(1000).get()).size;
      }
      const sample = await col.limit(1).get();
      const doc = sample.docs[0];
      if (!doc) return { name: col.id, count };
      const subs = await doc.ref.listCollections().catch(() => []);
      return {
        name: col.id,
        count,
        sampleId: doc.id,
        sampleFields: Object.keys(doc.data() ?? {}).sort(),
        subcollections: subs.length ? subs.map((s) => s.id) : undefined,
      };
    }),
  );
}

export async function POST(req: Request) {
  const app = getAdminApp();
  if (!app) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin is not configured on the server. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to run the scan.",
      },
      { status: 503 },
    );
  }

  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Missing auth token." }, { status: 401 });

  let caller;
  try {
    caller = await getAuth(app).verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
  }
  if (!(await isAuthorizedAdmin(app, caller.email))) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  // Scan the database the app reads, plus "(default)" when they differ — data
  // sitting in the other one is the whole explanation in that case.
  const ids = Array.from(new Set([FIREBASE_DATABASE_ID || "(default)", "(default)"]));
  const databases = await Promise.all(
    ids.map(async (id) => {
      try {
        const db = id === "(default)" ? getFirestore(app) : getFirestore(app, id);
        return { id, isAppDatabase: id === (FIREBASE_DATABASE_ID || "(default)"), collections: await scan(db) };
      } catch (e) {
        return {
          id,
          isAppDatabase: id === (FIREBASE_DATABASE_ID || "(default)"),
          collections: [] as CollectionInfo[],
          error: (e as Error)?.message ?? String(e),
        };
      }
    }),
  );

  return NextResponse.json({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    appDatabaseId: FIREBASE_DATABASE_ID || "(default)",
    expected: EXPECTED,
    databases,
  });
}
