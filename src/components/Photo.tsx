"use client";

import { gradientFor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

/**
 * A local, network-free stand-in for a classroom photo. In production these
 * map to Firebase Storage URLs; in demo mode we render a pleasant gradient
 * tile so the gallery is always populated.
 */
export function Photo({ id, className }: { id: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br",
        gradientFor(id),
        className,
      )}
    >
      <ImageIcon className="h-6 w-6 text-white/70" />
    </div>
  );
}
