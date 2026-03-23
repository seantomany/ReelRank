"use client";

import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#111",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#e8e8e8",
            fontSize: "13px",
          },
        }}
      />
    </AuthProvider>
  );
}
