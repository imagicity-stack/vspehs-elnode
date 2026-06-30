"use client";

// ─────────────────────────────────────────────────────────────
// El-Node — Toast notifications
// ─────────────────────────────────────────────────────────────
// A tiny, dependency-free notification bus. Any module (including the
// non-React data store) can call `toast.error(...)` / `toast.success(...)`
// and the <ToastViewport/> rendered in Providers shows it. This is what makes
// background failures (e.g. a Firestore write being denied) visible instead of
// dying silently in the console.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";
export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (t: ToastMessage) => void;

let listeners: Listener[] = [];
let counter = 0;

function emit(message: string, type: ToastType) {
  const t: ToastMessage = { id: ++counter, message, type };
  listeners.forEach((l) => l(t));
}

export const toast = {
  success: (m: string) => emit(m, "success"),
  error: (m: string) => emit(m, "error"),
  info: (m: string) => emit(m, "info"),
};

const styles: Record<ToastType, { icon: React.ReactNode; ring: string; iconColor: string }> = {
  success: { icon: <CheckCircle2 className="h-5 w-5" />, ring: "border-emerald-200", iconColor: "text-emerald-500" },
  error: { icon: <AlertTriangle className="h-5 w-5" />, ring: "border-rose-200", iconColor: "text-rose-500" },
  info: { icon: <Info className="h-5 w-5" />, ring: "border-slate-200", iconColor: "text-brand-500" },
};

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setToasts((cur) => [...cur, t]);
      // Errors linger a little longer so they aren't missed.
      const ttl = t.type === "error" ? 6000 : 3500;
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), ttl);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const dismiss = (id: number) => setToasts((cur) => cur.filter((x) => x.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((t) => {
        const s = styles[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${s.ring} bg-white p-3.5 shadow-soft`}
          >
            <span className={`mt-0.5 shrink-0 ${s.iconColor}`}>{s.icon}</span>
            <p className="flex-1 text-sm text-slate-700">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
