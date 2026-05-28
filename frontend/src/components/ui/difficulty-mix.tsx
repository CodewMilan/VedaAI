"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { DifficultyMix } from "@/lib/types";

interface DifficultyMixSliderProps {
  value: DifficultyMix;
  onChange: (v: DifficultyMix) => void;
  className?: string;
}

const TONE = {
  easy:     { dot: "bg-emerald-500", track: "bg-emerald-500", accent: "accent-emerald-500", label: "Easy",     bg: "bg-emerald-50",  text: "text-emerald-700"  },
  moderate: { dot: "bg-amber-500",   track: "bg-amber-500",   accent: "accent-amber-500",   label: "Moderate", bg: "bg-amber-50",    text: "text-amber-700"    },
  hard:     { dot: "bg-[#ff5623]",   track: "bg-[#ff5623]",   accent: "accent-[#ff5623]",   label: "Hard",     bg: "bg-[#fff0ea]",   text: "text-[#ff5623]"    },
} as const;

/**
 * Three-way ratio control where the user adjusts Easy and Moderate,
 * and Hard is computed so the total is always 100.
 */
export function DifficultyMixSlider({
  value,
  onChange,
  className,
}: DifficultyMixSliderProps) {
  const set = (key: "easy" | "moderate", v: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(v)));
    if (key === "easy") {
      const moderate = Math.min(value.moderate, 100 - clamped);
      const hard = 100 - clamped - moderate;
      onChange({ easy: clamped, moderate, hard });
    } else {
      const easy = Math.min(value.easy, 100 - clamped);
      const hard = 100 - easy - clamped;
      onChange({ easy, moderate: clamped, hard });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Combined preview bar */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[#f0f0f0]">
        <div
          className={cn("transition-all duration-200", TONE.easy.track)}
          style={{ width: `${value.easy}%` }}
          aria-label={`Easy ${value.easy}%`}
        />
        <div
          className={cn("transition-all duration-200", TONE.moderate.track)}
          style={{ width: `${value.moderate}%` }}
          aria-label={`Moderate ${value.moderate}%`}
        />
        <div
          className={cn("transition-all duration-200", TONE.hard.track)}
          style={{ width: `${value.hard}%` }}
          aria-label={`Hard ${value.hard}%`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Slider
          tone="easy"
          value={value.easy}
          onChange={(v) => set("easy", v)}
        />
        <Slider
          tone="moderate"
          value={value.moderate}
          onChange={(v) => set("moderate", v)}
        />
        <ReadOnlyTile value={value.hard} />
      </div>
    </div>
  );
}

function Slider({
  tone,
  value,
  onChange,
}: {
  tone: "easy" | "moderate";
  value: number;
  onChange: (v: number) => void;
}) {
  const t = TONE[tone];
  return (
    <label className="block rounded-xl border border-[#ececec] bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground">
          <span className={cn("h-2 w-2 rounded-full", t.dot)} />
          {t.label}
        </span>
        <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("h-1 w-full", t.accent)}
        aria-label={`${t.label} percentage`}
      />
    </label>
  );
}

function ReadOnlyTile({ value }: { value: number }) {
  const t = TONE.hard;
  return (
    <div className="rounded-xl border border-[#ececec] bg-[#fafafa] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground">
          <span className={cn("h-2 w-2 rounded-full", t.dot)} />
          {t.label}
        </span>
        <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
          {value}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ececec]">
        <div
          className={cn("h-full rounded-full transition-all duration-200", t.track)}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Auto-balanced to 100%</p>
    </div>
  );
}
