"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-white px-4 text-[14px]",
        "text-foreground placeholder:text-[#a9a9a9]",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:border-[#ff5623] focus-visible:ring-2 focus-visible:ring-[#ff5623]/15",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#f6f6f6]",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-input bg-white px-4 py-3 text-[14px] leading-relaxed",
        "text-foreground placeholder:text-[#a9a9a9]",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:border-[#ff5623] focus-visible:ring-2 focus-visible:ring-[#ff5623]/15",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#f6f6f6]",
        "resize-y",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
