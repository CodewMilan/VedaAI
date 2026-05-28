"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium tracking-[-0.56px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* Dark pill with orange border (sidebar CTA style) */
        primary:
          "relative overflow-hidden rounded-full border-4 border-[#ff7950] text-white active:scale-[0.98]",
        gradient:
          "relative overflow-hidden rounded-full border-4 border-[#ff7950] text-white active:scale-[0.98]",
        /* Orange solid */
        orange:
          "rounded-full bg-[#ff5623] text-white hover:bg-[#e54d1e] active:scale-[0.98] shadow-sm",
        /* Simple dark rounded */
        dark:
          "rounded-full bg-[#181818] text-white hover:bg-[#303030] active:scale-[0.98] border border-white/10",
        /* Outline */
        outline:
          "rounded-xl border border-[#e0e0e0] bg-white text-[#303030] hover:bg-[#f0f0f0] active:scale-[0.98]",
        secondary:
          "rounded-xl bg-[#f0f0f0] text-[#303030] hover:bg-[#e8e8e8] active:scale-[0.98]",
        ghost:
          "rounded-xl text-[#5e5e5e] hover:bg-[#f0f0f0] hover:text-[#303030]",
        destructive:
          "rounded-xl bg-[#c53535] text-white hover:bg-[#a02c2c] active:scale-[0.98]",
        link: "text-[#ff5623] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-10 px-5",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDarkPill = !asChild && (variant === "primary" || variant === "gradient");

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isDarkPill ? (
          <>
            <span className="pointer-events-none absolute inset-0 rounded-full bg-[#272727]" />
            <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0px_-1px_3.5px_0px_rgba(177,177,177,0.6),inset_0px_0px_34.5px_0px_rgba(255,255,255,0.25)]" />
            <span className="relative flex items-center gap-2">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
