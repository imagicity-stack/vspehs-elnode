import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, isAuthorizedAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Maps an HR-style StaffRole to a portal Role. Helpers share the teacher portal.
function toAppRole(staffRole: string): "teacher" | "accountant" | "superadmin" {
  if (staffRole === "accountant") return "accountant";
  if (staffRole === "superadmin") return "superadmin";
  return "teacher"; // teacher | helper
}

// Adds a staff member and AUTO-PROVISIONS their Firebase Auth login.
// • Caller must be an allowlisted Super Admin (verified via ID token).
// • Staff account: email = work email, password = generated temp password.
// • The portal role is written as a custom claim so login + Firestore rules
//   recognise the account without guessing from the email domain.
// • Writes staff/<id> and appUsers/<uid> documents in Firestore.
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
  if (!(await isAuthorizedAdmin(app, caller.email))) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  // 2) Validate payload.
  let body: { staff?: any; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const staff = body.staff;
  const email = String(staff?.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!staff?.id || !email.includes("@")) {
    return NextResponse.json({ error: "A valid staff record with a work email is required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const role = toAppRole(String(staff.role));

  // 3) Create (or reset) the staff Auth account.
  const adminAuth = getAuth(app);
  let uid: string;
  try {
    const rec = await adminAuth.createUser({ email, password, displayName: staff.name });
    uid = rec.uid;
  } catch (e: any) {
    if (e?.code === "auth/email-already-exists") {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
      await adminAuth.updateUser(uid, { password, displayName: staff.name });
    } else {
      return NextResponse.json({ error: "Could not create staff login.", detail: e?.message }, { status: 502 });
    }
  }

  // 4) Role claim + Firestore documents.
  await adminAuth.setCustomUserClaims(uid, { role, staffId: staff.id });
  const db = getFirestore(app);
  await db.collection("staff").doc(staff.id).set(staff, { merge: true });
  await db.collection("appUsers").doc(uid).set(
    {
      role,
      displayName: staff.name || "Staff",
      staffId: staff.id,
      email,
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, staffId: staff.id, email, role });
}
