import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { VedaLogo } from "@/components/brand/veda-logo";

interface ComingSoonProps {
  title: string;
  description: string;
  features?: string[];
}

export function ComingSoon({ title, description, features = [] }: ComingSoonProps) {
  return (
    <AppShell>
      <div className="mx-auto mt-4 max-w-2xl">
        <div className="overflow-hidden rounded-3xl bg-white p-8 card-shadow sm:p-12">
          <VedaLogo size={48} />

          <h1 className="mt-6 text-[28px] font-bold tracking-[-0.025em] text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>

          {features.length > 0 && (
            <ul className="mt-6 space-y-2.5 rounded-2xl bg-[#fafafa] p-5">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5623]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#181818] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#303030]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to assignments
            </Link>
            <Link
              href="/assignments/new"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dcdcdc] bg-white px-5 text-[14px] font-medium text-foreground transition-colors hover:bg-[#f6f6f6]"
            >
              <Sparkles className="h-4 w-4" />
              Create assignment
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
