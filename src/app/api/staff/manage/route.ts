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

  let body: {
    action?: string; staffId?: string; email?: string; newEmail?: string;
    role?: string; disabled?: boolean; name?: string; password?: string;
  };
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

  // Read-only account status, so the directory can show whether a login
  // exists, whether it is disabled, and when it was last used.
  if (body.action === "status") {
    if (!uid) return NextResponse.json({ ok: true, staffId, provisioned: false });
    try {
      const rec = await adminAuth.getUser(uid);
      return NextResponse.json({
        ok: true,
        staffId,
        provisioned: true,
        uid,
        disabled: rec.disabled,
        lastSignInAt: rec.metadata.lastSignInTime || null,
        createdAt: rec.metadata.creationTime || null,
      });
    } catch (e: any) {
      return NextResponse.json({ error: "Could not read account.", detail: e?.message }, { status: 502 });
    }
  }

  // Changes the address a staff member signs in with. The Firestore record and
  // the Firebase Auth account have to move together — updating only the record
  // would leave them signing in with the old address while the directory shows
  // the new one.
  if (body.action === "update-email") {
    const newEmail = String(body.newEmail || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (newEmail === email) {
      return NextResponse.json({ ok: true, staffId, email: newEmail, unchanged: true });
    }

    // Prefer the uid stored on the record: if a previous change half-applied,
    // looking the account up by the old address would find nothing.
    let targetUid = uid;
    if (!targetUid) {
      try {
        const stored = (await db.collection("staff").doc(staffId).get()).data()?.authUid;
        if (stored) {
          await adminAuth.getUser(String(stored));
          targetUid = String(stored);
        }
      } catch {
        targetUid = null;
      }
    }

    // Refuse if the address already belongs to someone else.
    try {
      const holder = await adminAuth.getUserByEmail(newEmail);
      if (holder.uid !== targetUid) {
        return NextResponse.json(
          { error: "That email already has a login on this project." },
          { status: 409 },
        );
      }
    } catch {
      /* nobody holds it — good */
    }
    try {
      const clash = await db.collection("staff").where("email", "==", newEmail).get();
      if (clash.docs.some((d) => d.id !== staffId)) {
        return NextResponse.json(
          { error: "Another staff member already uses that email." },
          { status: 409 },
        );
      }
    } catch {
      /* the Auth check above is the authoritative one */
    }

    if (targetUid) {
      try {
        await adminAuth.updateUser(targetUid, { email: newEmail });
      } catch (e: any) {
        return NextResponse.json(
          { error: "Could not update the login email.", detail: e?.message },
          { status: 502 },
        );
      }
      try {
        await db.collection("appUsers").doc(targetUid).set({ email: newEmail }, { merge: true });
      } catch { /* the Auth account is the source of truth for sign-in */ }
    }

    await db.collection("staff").doc(staffId).set(
      { email: newEmail, ...(targetUid ? { authUid: targetUid } : {}) },
      { merge: true },
    );

    return NextResponse.json({
      ok: true, staffId, email: newEmail, provisioned: Boolean(targetUid), uid: targetUid,
    });
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
    // Back on a default password — force the next sign-in to replace it.
    try {
      await db.collection("staff").doc(staffId).set(
        { mustChangePassword: true, authUid: uid },
        { merge: true },
      );
    } catch { /* the password reset itself succeeded */ }
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
      // Mirror the account state onto the staff record so the directory can
      // show it without a round trip per row.
      try {
        await db.collection("staff").doc(staffId).set(
          {
            authUid: uid,
            ...(typeof body.disabled === "boolean" ? { loginDisabled: body.disabled } : {}),
          },
          { merge: true },
        );
      } catch { /* ignore */ }
    }
    return NextResponse.json({ ok: true, staffId, provisioned: Boolean(uid) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
