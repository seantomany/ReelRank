"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

export function LoginForm() {
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Fill in all fields"); return; }
    setLoading(true);
    try {
      if (isSignUp) { await signUp(email, password); }
      else { await signIn(email, password); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const isMobile = typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleSocial = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    const fn = provider === "google" ? signInWithGoogle : signInWithApple;
    const label = provider === "google" ? "Google" : "Apple";
    try {
      if (isMobile) {
        await fn("redirect");
        return;
      }
      await fn("popup");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-closed-by-user") {
        // User intentionally closed the popup
      } else if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request"
      ) {
        toast.info(`Popup blocked — redirecting to ${label} sign-in...`);
        try {
          await fn("redirect");
        } catch {
          toast.error(`${label} redirect failed. Please try again.`);
        }
        return;
      } else if (code === "auth/operation-not-allowed") {
        toast.error(`${label} sign-in is not configured. Use email/password for now.`);
      } else if (code === "auth/unauthorized-domain") {
        toast.error(`This domain isn't authorized for ${label} sign-in.`);
      } else {
        const msg = err instanceof Error ? err.message : `${label} sign-in failed`;
        toast.error(msg);
        console.error(`[ReelRank] ${label} sign-in error:`, err);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-[#000]">
      <div className="w-full max-w-xs">
        <h1 className="text-lg font-semibold text-[#e8e8e8] mb-6">
          {isSignUp ? "Create account" : "Sign in to ReelRank"}
        </h1>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleSocial("google")}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 h-9 rounded-full border border-[rgba(255,255,255,0.1)] bg-[#111] hover:bg-[#1a1a1a] transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {socialLoading === "google" ? (
              <div className="w-4 h-4 border-2 border-[#888] border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            {socialLoading === "google" ? "Signing in..." : "Continue with Google"}
          </button>
          <button
            onClick={() => handleSocial("apple")}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 h-9 rounded-full border border-[rgba(255,255,255,0.1)] bg-[#111] hover:bg-[#1a1a1a] transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {socialLoading === "apple" ? (
              <div className="w-4 h-4 border-2 border-[#888] border-t-transparent rounded-full animate-spin" />
            ) : (
              <AppleIcon className="w-4 h-4" />
            )}
            {socialLoading === "apple" ? "Signing in..." : "Continue with Apple"}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          <span className="text-xs text-[#555]">or</span>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-sm text-[#888] hover:text-[#aaa] cursor-pointer"
        >
          {isSignUp ? "Have an account? Sign in" : "Need an account? Create one"}
        </button>
      </div>
    </div>
  );
}
