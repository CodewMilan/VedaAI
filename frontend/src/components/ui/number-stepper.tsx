"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  className,
  ariaLabel,
}: NumberStepperProps) {
  const dec = () => onChange(Math.max(min, Number((value - step).toFixed(2))));
  const inc = () => onChange(Math.min(max, Number((value + step).toFixed(2))));

  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-xl border border-input bg-white",
        "transition-colors duration-150 focus-within:border-[#ff5623] focus-within:ring-2 focus-within:ring-[#ff5623]/15",
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="flex h-11 w-10 items-center justify-center rounded-l-xl text-muted-foreground transition-colors duration-100 hover:bg-[#f0f0f0] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:bg-[#f0f0f0]"
        aria-label="Decrement"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className={cn(
          "h-full w-10 bg-transparent text-center text-[14px] font-semibold tabular-nums text-foreground",
          "outline-none [appearance:textfield]",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        )}
      />
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="flex h-11 w-10 items-center justify-center rounded-r-xl text-muted-foreground transition-colors duration-100 hover:bg-[#f0f0f0] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:bg-[#f0f0f0]"
        aria-label="Increment"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
