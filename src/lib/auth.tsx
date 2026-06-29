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
  signInWithEmailAndPassword, signOut, onAuthStateChanged, type User,
} from "firebase/auth";
import { auth, isDemoMode, admissionNoToEmail } from "./firebase";
import { AppUser, Role } from "./types";
import * as seed from "./mockData";

const SESSION_KEY = "elnode.session.v1";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  loginParent: (admissionNo: string, pin: string) => Promise<AppUser>;
  loginStaff: (email: string, password: string) => Promise<AppUser>;
  demoLoginAs: (role: Role) => AppUser;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Demo resolvers ───────────────────────────────────────────
function parentFromAdmissionNo(admissionNo: string): AppUser | null {
  const student = seed.students.find((s) => s.admissionNo === admissionNo.trim());
  if (!student) return null;
  // link siblings that study in the same school
  const linked = [student.id, ...student.siblings.map((sb) => sb.studentId).filter(Boolean) as string[]];
  return {
    uid: `parent-${student.id}`,
    role: "parent",
    displayName: student.fatherName || student.motherName || "Parent",
    studentIds: Array.from(new Set(linked)),
    admissionNo: student.admissionNo,
    email: student.parentEmail,
  };
}

function staffFromEmail(email: string): AppUser | null {
  const member = seed.staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
  if (!member) return null;
  const role: Role =
    member.role === "accountant" ? "accountant"
    : member.role === "superadmin" ? "superadmin"
    : "teacher"; // teachers + helpers use the teacher portal
  return {
    uid: `staff-${member.id}`,
    role,
    displayName: member.name,
    email: member.email,
    staffId: member.id,
    photoUrl: member.photoUrl,
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
      const u = parentFromAdmissionNo(admissionNo);
      if (!u) throw new Error("No student found for this number. Try 2025001.");
      persist(u);
      return u;
    }
    if (!auth) throw new Error("Auth unavailable.");
    await signInWithEmailAndPassword(auth, admissionNoToEmail(admissionNo.trim()), pin);
    // onAuthStateChanged resolves the AppUser
    const u = parentFromAdmissionNo(admissionNo) ?? {
      uid: "parent", role: "parent" as Role, displayName: "Parent", admissionNo,
    };
    return u;
  };

  const loginStaff = async (email: string, password: string): Promise<AppUser> => {
    if (isDemoMode) {
      const u = staffFromEmail(email);
      if (!u) throw new Error("No staff account for that email. Try admin@elnode.school.");
      persist(u);
      return u;
    }
    if (!auth) throw new Error("Auth unavailable.");
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const resolved = await resolveFirebaseUser(cred.user);
    return resolved;
  };

  const demoLoginAs = (role: Role): AppUser => {
    let u: AppUser | null = null;
    if (role === "parent") u = parentFromAdmissionNo("2025001");
    if (role === "teacher") u = staffFromEmail("anita@elnode.school");
    if (role === "accountant") u = staffFromEmail("accounts@elnode.school");
    if (role === "superadmin") u = staffFromEmail("admin@elnode.school");
    if (!u) throw new Error("Demo account unavailable.");
    persist(u);
    return u;
  };

  const logout = async () => {
    if (!isDemoMode && auth) await signOut(auth);
    persist(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginParent, loginStaff, demoLoginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// In a live project, the AppUser profile (role + links) lives in an
// `appUsers/{uid}` document. Here we approximate from the seeded directory.
async function resolveFirebaseUser(fbUser: User): Promise<AppUser> {
  const email = fbUser.email ?? "";
  if (email.includes("@parents.")) {
    const admissionNo = email.split("@")[0];
    return parentFromAdmissionNo(admissionNo) ?? {
      uid: fbUser.uid, role: "parent", displayName: "Parent", admissionNo,
    };
  }
  return staffFromEmail(email) ?? {
    uid: fbUser.uid, role: "teacher", displayName: fbUser.displayName ?? "Staff", email,
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
