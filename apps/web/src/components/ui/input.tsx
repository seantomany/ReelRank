"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex w-full rounded-md bg-[#111] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#555] outline-none transition-colors focus:border-[rgba(255,255,255,0.2)]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
