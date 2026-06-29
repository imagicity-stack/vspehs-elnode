"use client";

// ─────────────────────────────────────────────────────────────
// El-Node — Authentication
// ─────────────────────────────────────────────────────────────
// • Parents sign in with a 7-digit admission number (+ PIN).
// • Staff sign in with their work email (+ password).
//
// When Firebase is configured these flow through Firebase Auth
// (email/password — the parent's number is synthesised into an email).
// In DEMO MODE the same API resolves against the seeded dataset, so the
// whole product is usable with one click.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut,
  onAuthStateChanged, type User,
} from "firebase/auth";
import {
  auth, isDemoMode, admissionNoToEmail, isSuperAdminEmail, SUPERADMIN_EMAILS,
  PARENT_EMAIL_DOMAIN,
} from "./firebase";
import { AppUser, Role } from "./types";

const SESSION_KEY = "elnode.session.v2";

// Minimal demo accounts used for one-click login when Firebase is not configured.
const DEMO_ROLES: Record<string, Role> = {
  "teacher": "teacher",
  "accountant": "accountant",
  "superadmin": "superadmin",
};

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  loginParent: (admissionNo: string, pin: string) => Promise<AppUser>;
  loginStaff: (email: string, password: string) => Promise<AppUser>;
  loginWithGoogle: () => Promise<AppUser>;
  demoLoginAs: (role: Role) => AppUser;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function superAdminAppUser(email: string, name?: string, photo?: string): AppUser {
  return {
    uid: `superadmin-${email}`,
    role: "superadmin",
    displayName: name || email.split("@")[0] || "Super Admin",
    email,
    photoUrl: photo,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    if (isDemoMode) {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      setLoading(false);
      return;
    }
    // Firebase mode: react to auth state.
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      const resolved = await resolveFirebaseUser(fbUser);
      setUser(resolved);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const persist = (u: AppUser | null) => {
    setUser(u);
    if (isDemoMode) {
      try {
        if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        else localStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  const loginParent = async (admissionNo: string, pin: string): Promise<AppUser> => {
    if (!/^\d{7}$/.test(admissionNo.trim())) {
      throw new Error("Please enter a valid 7-digit admission number.");
    }
    if (isDemoMode) {
      const u: AppUser = {
        uid: `parent-${admissionNo}`,
        role: "parent",
        displayName: "Parent",
        admissionNo: admissionNo.trim(),
        studentIds: [],
      };
      persist(u);
      return u;
    }
    if (!auth) throw new Error("Auth unavailable.");
    await signInWithEmailAndPassword(auth, admissionNoToEmail(admissionNo.trim()), pin);
    // onAuthStateChanged will call resolveFirebaseUser and update the user state.
    return { uid: "pending", role: "parent", displayName: "Parent", admissionNo };
  };

  const loginStaff = async (email: string, password: string): Promise<AppUser> => {
    if (isDemoMode) {
      throw new Error("Firebase is required for staff login. Please configure Firebase credentials.");
    }
    if (!auth) throw new Error("Auth unavailable.");
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const resolved = await resolveFirebaseUser(cred.user);
    return resolved;
  };

  const loginWithGoogle = async (): Promise<AppUser> => {
    if (isDemoMode) {
      const email = SUPERADMIN_EMAILS[0] || "admin@school.app";
      const u = superAdminAppUser(email, "Super Admin");
      persist(u);
      return u;
    }
    if (!auth) throw new Error("Auth unavailable.");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const email = cred.user.email;
    if (!isSuperAdminEmail(email)) {
      await signOut(auth);
      throw new Error("This Google account is not authorised for admin access.");
    }
    return superAdminAppUser(email!, cred.user.displayName ?? undefined, cred.user.photoURL ?? undefined);
  };

  const demoLoginAs = (role: Role): AppUser => {
    const labels: Record<Role, string> = {
      parent: "Parent", teacher: "Teacher", accountant: "Accountant", superadmin: "Super Admin",
    };
    const u: AppUser = {
      uid: `demo-${role}`,
      role,
      displayName: labels[role],
      ...(role === "parent" ? { studentIds: [], admissionNo: "0000000" } : { staffId: `demo-staff-${role}` }),
    };
    persist(u);
    return u;
  };

  const logout = async () => {
    if (!isDemoMode && auth) await signOut(auth);
    persist(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginParent, loginStaff, loginWithGoogle, demoLoginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Resolves a Firebase Auth user to an AppUser. In production the
// `appUsers/{uid}` Firestore document holds the role and linked IDs.
// Here we derive the role from the email domain / allowlist as a fallback.
async function resolveFirebaseUser(fbUser: User): Promise<AppUser> {
  const email = fbUser.email ?? "";
  if (isSuperAdminEmail(email)) {
    return superAdminAppUser(email, fbUser.displayName ?? undefined, fbUser.photoURL ?? undefined);
  }
  if (email.endsWith(`@${PARENT_EMAIL_DOMAIN}`) || email.includes("@parents.")) {
    const admissionNo = email.split("@")[0];
    return {
      uid: fbUser.uid,
      role: "parent",
      displayName: fbUser.displayName ?? "Parent",
      admissionNo,
      studentIds: [],
      email,
    };
  }
  // Default staff — role should be read from Firestore appUsers doc in production.
  return {
    uid: fbUser.uid,
    role: "teacher",
    displayName: fbUser.displayName ?? "Staff",
    email,
    staffId: fbUser.uid,
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export const portalHome: Record<Role, string> = {
  parent: "/parent",
  teacher: "/teacher",
  accountant: "/accountant",
  superadmin: "/admin",
};
