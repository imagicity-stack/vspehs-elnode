"use client";

import { useEffect, useState } from "react";
import { Download, X, GraduationCap } from "lucide-react";

// Registers the service worker and surfaces a lightweight "Install app" prompt
// when the browser fires `beforeinstallprompt`.
export function PWARegister() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      // Don't nag if already dismissed this session.
      if (sessionStorage.getItem("elnode.install.dismissed") !== "1") setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!show || !prompt) return null;

  const install = async () => {
    setShow(false);
    prompt.prompt();
    try { await prompt.userChoice; } catch { /* ignore */ }
    setPrompt(null);
  };
  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem("elnode.install.dismissed", "1");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 no-print">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Install El-Node</p>
          <p className="truncate text-xs text-slate-500">Add to your home screen for quick, offline access.</p>
        </div>
        <button onClick={install} className="btn-primary shrink-0 px-3 py-2 text-xs">
          <Download className="h-4 w-4" /> Install
        </button>
        <button onClick={dismiss} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
