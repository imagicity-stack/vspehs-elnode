import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, authorizeAdmin } from "@/lib/firebaseAdmin";
import { DEFAULT_PASSWORD } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manages an existing student's lifecycle (Super Admin only):
//   { action: "create-login", studentId, admissionNo, pin? }
//     → provision (or re-sync) the parent Auth login for an existing student.
//   { action: "reset", studentId, admissionNo, pin }
//     → change the parent login's PIN.
//   { action: "delete", studentId, admissionNo }
//     → remove the parent Auth login and the student + appUsers documents.
export async function POST(req: Request) {
  const app = getAdminApp();
  if (!app) {
    return NextResponse.json({ error: "Firebase Admin is not configured on the server." }, { status: 503 });
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
  const adminAuthz = await authorizeAdmin(app, caller);
  if (!adminAuthz.ok) {
    return NextResponse.json(
      { error: "Not authorised.", detail: adminAuthz.reason, email: caller.email ?? null },
      { status: 403 },
    );
  }

  let body: { action?: string; studentId?: string; admissionNo?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const studentId = String(body.studentId || "");
  const admissionNo = String(body.admissionNo || "");
  if (!studentId) return NextResponse.json({ error: "studentId is required." }, { status: 400 });

  const adminAuth = getAuth(app);
  const db = getFirestore(app);
  const domain = process.env.NEXT_PUBLIC_PARENT_EMAIL_DOMAIN || "parents.el-node.app";

  // Provisions the parent login for a student that already has a record.
  // `create` refuses once the student document exists, so without this a
  // half-created student — record saved, login not — could only be repaired by
  // deleting and re-adding them. Idempotent: an account that already exists is
  // re-synced rather than treated as an error.
  if (body.action === "create-login") {
    if (!admissionNo) {
      return NextResponse.json({ error: "admissionNo is required." }, { status: 400 });
    }
    const email = `${admissionNo}@${domain}`;
    const password = String(body.pin || DEFAULT_PASSWORD);

    // Name the login the same way `create` does, so a repaired account is
    // indistinguishable from one provisioned at admission time.
    const snap = await db.collection("students").doc(studentId).get();
    const s = snap.exists ? (snap.data() as any) : null;
    const childName = s ? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() : "";
    const displayName = childName ? `${childName} (Parent)` : `Parent · ${admissionNo}`;
    const parentName = s?.fatherName || s?.motherName || "Parent";

    let uid: string;
    let existed = false;
    try {
      uid = (await adminAuth.getUserByEmail(email)).uid;
      existed = true;
    } catch {
      try {
        uid = (await adminAuth.createUser({ email, password, displayName })).uid;
      } catch (e: any) {
        return NextResponse.json(
          { error: "Could not create the parent login.", detail: e?.message },
          { status: 502 },
        );
      }
    }

    try {
      await adminAuth.setCustomUserClaims(uid, { role: "parent", studentId });
      await db.collection("appUsers").doc(uid).set(
        { role: "parent", displayName: parentName, studentIds: [studentId], admissionNo, email },
        { merge: true },
      );
      await db.collection("students").doc(studentId).set({ parentAuthUid: uid }, { merge: true });
    } catch (e: any) {
      return NextResponse.json(
        { error: "Login created, but its profile could not be written.", detail: e?.message },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, studentId, uid, parentEmail: email, existed });
  }

  // Reset the parent login's PIN.
  if (body.action === "reset") {
    const pin = String(body.pin || "");
    if (pin.length < 6) {
      return NextResponse.json({ error: "PIN must be at least 6 characters." }, { status: 400 });
    }
    if (!admissionNo) return NextResponse.json({ error: "admissionNo is required." }, { status: 400 });
    try {
      const uid = (await adminAuth.getUserByEmail(`${admissionNo}@${domain}`)).uid;
      await adminAuth.updateUser(uid, { password: pin });
    } catch (e: any) {
      return NextResponse.json({ error: "Could not reset PIN.", detail: e?.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, studentId });
  }

  if (body.action !== "delete") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  if (admissionNo) {
    const email = `${admissionNo}@${domain}`;
    try {
      const uid = (await adminAuth.getUserByEmail(email)).uid;
      try { await adminAuth.deleteUser(uid); } catch { /* already gone */ }
      try { await db.collection("appUsers").doc(uid).delete(); } catch { /* ignore */ }
    } catch {
      /* no parent login to remove */
    }
  }
  try { await db.collection("students").doc(studentId).delete(); } catch { /* ignore */ }

  return NextResponse.json({ ok: true, deleted: studentId });
}
