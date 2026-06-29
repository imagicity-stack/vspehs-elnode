import Link from "next/link";
import {
  GraduationCap, HeartPulse, CalendarCheck, Wallet, Users, BarChart3,
  CameraIcon, FileText, ShieldCheck, ArrowRight, Sparkles,
} from "lucide-react";

const features = [
  { icon: HeartPulse, title: "Student Safety Profiles", desc: "Photo, DOB, blood group, allergies, emergency contacts, authorised pickup persons & sibling links — safety first." },
  { icon: CameraIcon, title: "Daily Parent Updates", desc: "Mood, meals, naps, classroom photos, homework & activity notes pushed to parents every single day." },
  { icon: CalendarCheck, title: "Digital Attendance", desc: "Class-wise marking, late-entry tracking, instant absent alerts to parents and staff attendance." },
  { icon: Wallet, title: "Fee Management", desc: "Monthly/quarterly, transport & activity fees, concessions, reminders, receipts and pending reports — zero leakage." },
  { icon: Users, title: "Staff Management", desc: "Profiles, qualifications, duty allocation, leave workflow and a daily task checklist for every teacher." },
  { icon: FileText, title: "Exams & Report Cards", desc: "Skill-based progress assessments with downloadable, print-ready report cards for pre-primary." },
  { icon: BarChart3, title: "State-of-the-art Analytics", desc: "Live dashboards for attendance, collections, enrolment and class health across the whole school." },
  { icon: ShieldCheck, title: "Role-based Portals", desc: "Separate, secure experiences for parents, teachers, accountants and the super admin." },
];

const portals = [
  { href: "/login", label: "Parent Portal", sub: "7-digit admission number", color: "bg-rose-500" },
  { href: "/login/staff", label: "Teacher Portal", sub: "Email sign-in", color: "bg-emerald-500" },
  { href: "/login/staff", label: "Accounts Portal", sub: "Email sign-in", color: "bg-amber-500" },
  { href: "/login/staff", label: "Super Admin", sub: "Email sign-in", color: "bg-brand-600" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">El-Node</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login/staff" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block">
              Staff Login
            </Link>
            <Link href="/login" className="btn-primary">
              Parent Login <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-white to-white" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-700">
            <Sparkles className="h-4 w-4" /> Purpose-built for pre-primary schools
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl">
            The complete ERP for your{" "}
            <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">little stars</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500">
            El-Node brings student safety profiles, daily parent updates, digital attendance, watertight fee
            management, staff workflows and live analytics into one delightful platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-base">
              Open Parent Portal <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login/staff" className="btn-ghost px-6 py-3 text-base">
              Staff Login
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Try the live demo — pick a role on the login screen, no setup needed.
          </p>
        </div>
      </section>

      {/* Portal cards */}
      <section className="mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {portals.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${p.color} text-white`}>
                <Users className="h-5 w-5" />
              </div>
              <p className="font-semibold text-slate-900">{p.label}</p>
              <p className="text-sm text-slate-400">{p.sub}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
                Enter <ArrowRight className="h-4 w-4" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Everything a pre-primary school needs</h2>
          <p className="mt-3 text-slate-500">From the first hello at the gate to the term-end report card.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-center text-white shadow-soft">
          <h2 className="text-3xl font-bold">Ready to give parents daily peace of mind?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Sign in to explore the parent, teacher, accounts and admin experiences.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn bg-white px-6 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50">
              Parent Login
            </Link>
            <Link href="/login/staff" className="btn border border-white/30 px-6 py-3 text-base font-semibold text-white hover:bg-white/10">
              Staff Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-400 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="font-semibold text-slate-600">El-Node</span> · Pre-Primary School ERP
          </div>
          <p>Built with Next.js · Firebase · Vercel</p>
        </div>
      </footer>
    </div>
  );
}
