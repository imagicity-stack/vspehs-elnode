import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, isAuthorizedAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manages an existing student's lifecycle (Super Admin only):
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
  if (!(await isAuthorizedAdmin(app, caller.email))) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
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
