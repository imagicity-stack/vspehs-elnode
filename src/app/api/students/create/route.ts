import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { isSuperAdminEmail, DEFAULT_PASSWORD } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adds a student and AUTO-PROVISIONS the parent's Firebase Auth login.
// • Caller must be an allowlisted Super Admin (verified via ID token).
// • Parent account: email = <admissionNo>@<PARENT_EMAIL_DOMAIN>, password = PIN.
// • Writes students/<id> and appUsers/<uid> documents in Firestore.
export async function POST(req: Request) {
  const app = getAdminApp();
  if (!app) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured on the server." },
      { status: 503 },
    );
  }

  // 1) Authenticate the caller.
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Missing auth token." }, { status: 401 });

  let caller;
  try {
    caller = await getAuth(app).verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
  }
  if (!isSuperAdminEmail(caller.email)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  // 2) Validate payload.
  let body: { student?: any; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const student = body.student;
  if (!student?.id || !/^\d{7}$/.test(String(student.admissionNo || ""))) {
    return NextResponse.json({ error: "A valid 7-digit admission number is required." }, { status: 400 });
  }

  const domain = process.env.NEXT_PUBLIC_PARENT_EMAIL_DOMAIN || "parents.el-node.app";
  const email = `${student.admissionNo}@${domain}`;
  const password = String(body.pin || DEFAULT_PASSWORD);
  const displayName = `${student.firstName} ${student.lastName} (Parent)`.trim();

  // 3) Create (or reset) the parent Auth account.
  const adminAuth = getAuth(app);
  let uid: string;
  try {
    const rec = await adminAuth.createUser({ email, password, displayName });
    uid = rec.uid;
  } catch (e: any) {
    if (e?.code === "auth/email-already-exists") {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
      await adminAuth.updateUser(uid, { password });
    } else {
      return NextResponse.json({ error: "Could not create parent login.", detail: e?.message }, { status: 502 });
    }
  }

  // 4) Role claim + Firestore documents.
  await adminAuth.setCustomUserClaims(uid, { role: "parent", studentId: student.id });
  const db = getFirestore(app);
  await db.collection("students").doc(student.id).set(student, { merge: true });
  await db.collection("appUsers").doc(uid).set(
    {
      role: "parent",
      displayName: student.fatherName || student.motherName || "Parent",
      studentIds: [student.id],
      admissionNo: student.admissionNo,
      email,
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, studentId: student.id, parentEmail: email });
}
