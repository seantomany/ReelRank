"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function Tabs({ value, onValueChange, children, className }: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onChange: onValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex gap-6 border-b border-[rgba(255,255,255,0.08)]", className)}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      className={cn(
        "relative pb-3 text-sm transition-colors cursor-pointer",
        active ? "text-[#e8e8e8] font-medium" : "text-[#888] hover:text-[#aaa]",
        className
      )}
      onClick={() => ctx.onChange(value)}
      {...props}
    >
      {children}
      {active && <span className="absolute bottom-0 left-0 right-0 h-px bg-[#ff2d55]" />}
    </button>
  );
}

function TabsContent({ value, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return <div className={cn("mt-4", className)} role="tabpanel" {...props}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
