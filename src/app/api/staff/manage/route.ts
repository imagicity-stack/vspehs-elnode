import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, isAuthorizedAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toAppRole(staffRole: string): "teacher" | "accountant" | "superadmin" {
  if (staffRole === "accountant") return "accountant";
  if (staffRole === "superadmin") return "superadmin";
  return "teacher"; // teacher | helper
}

// Manages an existing staff account's lifecycle (Super Admin only):
//   { action: "update", staffId, email, role?, disabled?, name? }
//     → enable/disable the login, refresh the role claim, sync the docs.
//   { action: "delete", staffId, email }
//     → remove the Auth login and the staff + appUsers documents.
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

  let body: { action?: string; staffId?: string; email?: string; role?: string; disabled?: boolean; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const staffId = String(body.staffId || "");
  const email = String(body.email || "").trim().toLowerCase();
  if (!staffId) return NextResponse.json({ error: "staffId is required." }, { status: 400 });

  const adminAuth = getAuth(app);
  const db = getFirestore(app);

  // Look up the Auth account by email (it may not exist if never provisioned).
  let uid: string | null = null;
  if (email.includes("@")) {
    try {
      uid = (await adminAuth.getUserByEmail(email)).uid;
    } catch {
      uid = null; // no login to act on
    }
  }

  if (body.action === "reset") {
    const password = String(body.password || "");
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    if (!uid) {
      return NextResponse.json({ error: "No login exists for this staff member yet." }, { status: 404 });
    }
    try {
      await adminAuth.updateUser(uid, { password });
    } catch (e: any) {
      return NextResponse.json({ error: "Could not reset password.", detail: e?.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, staffId });
  }

  if (body.action === "delete") {
    if (uid) {
      try { await adminAuth.deleteUser(uid); } catch { /* already gone */ }
      try { await db.collection("appUsers").doc(uid).delete(); } catch { /* ignore */ }
    }
    try { await db.collection("staff").doc(staffId).delete(); } catch { /* ignore */ }
    return NextResponse.json({ ok: true, deleted: staffId });
  }

  if (body.action === "update") {
    const role = body.role ? toAppRole(String(body.role)) : undefined;
    if (uid) {
      const patch: { disabled?: boolean; displayName?: string } = {};
      if (typeof body.disabled === "boolean") patch.disabled = body.disabled;
      if (body.name) patch.displayName = body.name;
      if (Object.keys(patch).length) {
        try { await adminAuth.updateUser(uid, patch); } catch { /* ignore */ }
      }
      if (role) {
        await adminAuth.setCustomUserClaims(uid, { role, staffId });
        try {
          await db.collection("appUsers").doc(uid).set({ role }, { merge: true });
        } catch { /* ignore */ }
      }
    }
    return NextResponse.json({ ok: true, staffId, provisioned: Boolean(uid) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
