"use client";

import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/store";
import { ToastViewport } from "@/components/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>{children}</DataProvider>
      <ToastViewport />
    </AuthProvider>
  );
}
