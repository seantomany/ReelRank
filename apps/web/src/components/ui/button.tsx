"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-all duration-100 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 active:scale-[0.96] cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#ff2d55] text-white rounded-full font-semibold hover:bg-[#e0264d]",
        secondary: "border border-[rgba(255,255,255,0.1)] text-[#e8e8e8] rounded-full hover:bg-[#111]",
        ghost: "text-[#888] hover:text-[#e8e8e8]",
        link: "text-[#e8e8e8] hover:underline p-0 h-auto",
        destructive: "text-red-400 hover:text-red-300",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-7 px-3 text-xs",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
