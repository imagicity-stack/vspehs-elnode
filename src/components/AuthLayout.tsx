"use client";

import Link from "next/link";
import { SCHOOL_NAME, SCHOOL_LOCATION } from "@/lib/branding";
import { SchoolCrest } from "@/components/ui";

export function AuthLayout({
  title, subtitle, children,
}: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-brand-900 p-12 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <SchoolCrest size={36} />
          </div>
          <div className="leading-tight">
            <p className="text-xl font-extrabold">{SCHOOL_NAME}</p>
            <p className="text-sm text-brand-100">{SCHOOL_LOCATION}</p>
          </div>
        </Link>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">
            Daily peace of mind for every parent.
          </h2>
          <p className="mt-4 max-w-md text-brand-100">
            Attendance, photos, meals, naps, homework and fees — all in one place, updated every day.
          </p>
        </div>
        <div className="flex gap-6 text-sm text-brand-100">
          <div><p className="text-base font-bold text-white">Attendance</p>daily care</div>
          <div><p className="text-base font-bold text-white">Updates</p>photos & meals</div>
          <div><p className="text-base font-bold text-white">Fees</p>pay online</div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <SchoolCrest size={34} />
            <span className="text-lg font-extrabold leading-tight text-slate-900">{SCHOOL_NAME}</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
