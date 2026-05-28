"use client";

import * as React from "react";
import { Loader2, AlertCircle, Check } from "lucide-react";
import type { Assignment } from "@/lib/types";
import { VedaLogo } from "@/components/brand/veda-logo";
import { cn } from "@/lib/utils";

interface GeneratingStateProps {
  assignment: Assignment;
}

const STAGES = [
  { key: "queued",     label: "Queued",            description: "Waiting for an open worker" },
  { key: "preparing",  label: "Preparing",         description: "Parsing your inputs" },
  { key: "generating", label: "Drafting questions",description: "Asking the model to write the paper" },
  { key: "validating", label: "Validating",        description: "Structuring the paper into sections" },
  { key: "completed",  label: "Ready",             description: "Your paper is ready to view" },
];

export function GeneratingState({ assignment }: GeneratingStateProps) {
  const currentIndex = stageIndex(assignment.stage, assignment.status);
  const progress = assignment.progress ?? 0;
  const failed = assignment.status === "failed";

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      {/* ── Main: progress ── */}
      <section className="overflow-hidden rounded-2xl bg-white card-shadow">
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-[#f0f0f0] p-6 sm:p-8">
          {failed ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c53535] text-white">
              <AlertCircle className="h-5 w-5" />
            </div>
          ) : (
            <VedaLogo size={44} className="shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {failed ? "Generation failed" : "Generating"}
            </div>
            <h2 className="mt-1 truncate text-[18px] font-bold tracking-[-0.02em] text-foreground">
              {assignment.title}
            </h2>
          </div>
        </div>

        {/* Progress + stages */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted-foreground">
              Progress
            </span>
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              {progress}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f0]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                failed ? "bg-[#c53535]" : "bg-[#ff5623]"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="mt-8 space-y-4">
            {STAGES.map((s, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              const errored = failed && active;

              return (
                <li key={s.key} className="flex items-start gap-4">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                      done && "border-emerald-500 bg-emerald-500 text-white",
                      active && !errored && "border-[#ff5623] bg-[#ff5623] text-white",
                      errored && "border-[#c53535] bg-[#c53535] text-white",
                      !done && !active && "border-[#e4e4e4] bg-white text-muted-foreground"
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active && !errored ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : errored ? (
                      "!"
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div
                      className={cn(
                        "text-[14px] font-medium",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {s.description}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {failed && (
            <div className="mt-6 rounded-xl border border-[#f3c8c8] bg-[#fdecec] p-4 text-[13px]">
              <div className="font-semibold text-[#c53535]">
                Generation failed
              </div>
              <div className="mt-1 text-[#c53535]/85">
                {assignment.error ?? "An unknown error occurred."}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Side: summary ── */}
      <aside className="rounded-2xl bg-white p-6 card-shadow lg:self-start">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </h3>
        <dl className="mt-4 space-y-3 text-[14px]">
          <Row label="Subject" value={assignment.subject} />
          {assignment.classGrade && (
            <Row label="Class" value={assignment.classGrade} />
          )}
          <Row
            label="Question types"
            value={`${assignment.questionTypes.length}`}
          />
          <Row
            label="Total questions"
            value={`${assignment.questionTypes.reduce((s, q) => s + q.count, 0)}`}
          />
          <Row
            label="Total marks"
            value={`${assignment.questionTypes.reduce((s, q) => s + q.count * q.marks, 0)}`}
          />
        </dl>
      </aside>
    </div>
  );
}

function stageIndex(stage: string | undefined, status: string): number {
  const map: Record<string, number> = {
    queued: 0,
    preparing: 1,
    generating: 2,
    validating: 3,
    completed: 4,
    failed: 4,
  };
  if (status === "completed") return 4;
  if (status === "failed") return map[stage ?? "generating"] ?? 2;
  return map[stage ?? "queued"] ?? 0;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}
