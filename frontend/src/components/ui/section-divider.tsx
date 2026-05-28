import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionDividerProps {
  label?: React.ReactNode;
  className?: string;
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-px flex-1 bg-border" />
      {label ? (
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
