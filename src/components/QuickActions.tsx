"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type QuickTone = "brand" | "green" | "amber" | "violet" | "sky" | "rose" | "slate";

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: QuickTone;
}

const toneMap: Record<QuickTone, string> = {
  brand: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

/**
 * Tile-based launcher for a portal's primary actions. Thumb-friendly targets,
 * 2-up on phones widening to 4-up on desktop — the mobile-first home hero.
 */
export function QuickActions({ actions, title = "Quick actions" }: { actions: QuickAction[]; title?: string }) {
  if (actions.length === 0) return null;
  return (
    <section>
      {title && <h2 className="mb-3 px-0.5 text-sm font-semibold text-slate-500">{title}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="group flex min-h-[104px] flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand-200 hover:shadow-soft active:scale-[0.98]"
            >
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneMap[a.tone ?? "brand"])}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                {a.hint && <p className="mt-0.5 truncate text-xs text-slate-400">{a.hint}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
