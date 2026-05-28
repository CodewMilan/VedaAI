"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    hint?: string;
  }
>(({ className, children, hint, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "flex items-center justify-between text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5",
      className
    )}
    {...props}
  >
    <span>{children}</span>
    {hint ? (
      <span className="text-xs font-normal text-muted-foreground">{hint}</span>
    ) : null}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
