"use client";

import { useAuth } from "@/context/auth-context";
import { LoginForm } from "./login-form";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000]">
        <div className="w-5 h-5 border-2 border-[rgba(255,255,255,0.1)] border-t-[#e8e8e8] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm />;
  return <>{children}</>;
}
