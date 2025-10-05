"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export default function SessionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster richColors position="bottom-right" />
    </SessionProvider>
  );
}
