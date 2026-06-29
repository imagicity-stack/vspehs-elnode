"use client";

import React from "react";
import Link from "next/link";
import { cn, initials, colorFromString } from "@/lib/utils";

// ── Avatar ───────────────────────────────────────────────────
export function Avatar({
  name, src, size = 40, className,
}: { name: string; src?: string; size?: number; className?: string }) {
  const c = colorFromString(name);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn("flex items-center justify-center rounded-full font-semibold", className)}
      style={{ width: size, height: size, background: c.bg, color: c.fg, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────
export function Card({
  className, children, ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title, subtitle, action, icon,
}: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon && <div className="rounded-xl bg-brand-50 p-2 text-brand-600">{icon}</div>}
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────
type Tone = "brand" | "green" | "amber" | "red" | "slate" | "violet" | "sky";
const toneMap: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-700",
  sky: "bg-sky-50 text-sky-700",
};
export function Badge({
  tone = "slate", children, className,
}: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn("chip", toneMap[tone], className)}>{children}</span>;
}

// ── Stat card ────────────────────────────────────────────────
export function Stat({
  label, value, icon, hint, tone = "brand", trend,
}: {
  label: string; value: React.ReactNode; icon?: React.ReactNode; hint?: string; tone?: Tone;
  trend?: { value: string; up?: boolean };
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        {icon && <div className={cn("rounded-xl p-2.5", toneMap[tone])}>{icon}</div>}
      </div>
      {(hint || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span className={cn("font-semibold", trend.up ? "text-emerald-600" : "text-rose-600")}>
              {trend.up ? "▲" : "▼"} {trend.value}
            </span>
          )}
          {hint && <span className="text-slate-400">{hint}</span>}
        </div>
      )}
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────
export function EmptyState({
  icon, title, hint,
}: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Simple table ─────────────────────────────────────────────
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400", className)}>
      {children}
    </th>
  );
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-4 py-3 text-slate-700", className)}>{children}</td>;
}

// ── Button (link or action) ──────────────────────────────────
export function Button({
  href, children, variant = "primary", className, ...props
}: {
  href?: string; variant?: "primary" | "ghost" | "soft";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cn(
    variant === "primary" ? "btn-primary" : variant === "soft" ? "btn-soft" : "btn-ghost",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

// ── Progress bar ─────────────────────────────────────────────
export function Progress({ value, tone = "brand" }: { value: number; tone?: Tone }) {
  const bar: Record<Tone, string> = {
    brand: "bg-brand-500", green: "bg-emerald-500", amber: "bg-amber-500",
    red: "bg-rose-500", slate: "bg-slate-400", violet: "bg-violet-500", sky: "bg-sky-500",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full transition-all", bar[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
