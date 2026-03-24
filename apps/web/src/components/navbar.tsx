"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Home, Compass, Users, User, Sparkles } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/group", label: "Group", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export function Navbar({ onSearchOpen }: { onSearchOpen: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-14 items-center justify-between px-6 bg-[#000]/95 backdrop-blur-sm border-b border-[rgba(255,255,255,0.06)]">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="ReelRank" width={28} height={28} className="w-7 h-7" />
          <span className="text-base font-semibold text-[#e8e8e8] tracking-tight">ReelRank</span>
        </Link>

        <div className="flex items-center gap-6">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "text-sm transition-colors",
                isActive(t.href) ? "text-[#e8e8e8]" : "text-[#888] hover:text-[#aaa]"
              )}
            >
              {t.label}
              {isActive(t.href) && (
                <span className="block h-px bg-[#ff2d55] mt-0.5" />
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSearchOpen}
            className="text-[#888] hover:text-[#e8e8e8] transition-colors cursor-pointer p-1"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded-full bg-[#111] flex items-center justify-center text-[#888] hover:text-[#e8e8e8] transition-colors cursor-pointer text-xs font-medium"
            >
              {user?.email?.charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-md py-1 z-50">
                <div className="px-3 py-2 text-xs text-[#888] truncate border-b border-[rgba(255,255,255,0.08)]">
                  {user?.email}
                </div>
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-[#888] hover:text-[#e8e8e8] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-40 h-12 flex items-center justify-between px-4 bg-[#000]/95">
        <Link href="/" className="flex items-center gap-1.5">
          <Image src="/logo.png" alt="ReelRank" width={24} height={24} className="w-6 h-6" />
          <span className="text-sm font-semibold text-[#e8e8e8]">ReelRank</span>
        </Link>
        <button onClick={onSearchOpen} className="text-[#888] p-1 cursor-pointer" aria-label="Search">
          <Search className="w-4 h-4" />
        </button>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-start justify-around pt-2 bg-[#000]/95 border-t border-[rgba(255,255,255,0.06)] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] justify-center transition-colors",
                active ? "text-[#e8e8e8]" : "text-[#888]"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px]">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
