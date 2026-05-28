"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxCardProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function CheckboxCard({
  checked,
  onCheckedChange,
  title,
  description,
  icon,
  className,
}: CheckboxCardProps) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150",
        "hover:border-violet-300 hover:bg-violet-50/30",
        "dark:hover:border-violet-500/40 dark:hover:bg-violet-500/5",
        checked
          ? "border-violet-500 bg-violet-50/60 ring-1 ring-violet-500/30 dark:bg-violet-500/10"
          : "border-border bg-background",
        className
      )}
      aria-pressed={checked}
    >
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          checked
            ? "border-violet-600 bg-violet-600 text-white"
            : "border-input bg-background"
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
          {title}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </button>
  );
}
