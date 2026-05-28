"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Filter, Search, Plus, FileSearch, Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useAssignmentsStore } from "@/store/assignments";
import { useGroupsStore } from "@/store/groups";
import { AssignmentCard } from "@/components/dashboard/assignment-card";
import type { AssignmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Dashboard view — the canonical "assignments list" screen.
 *
 * Per Figma node 2:10640: search + filter row appears only when
 * there's at least one assignment. When the list is empty we render
 * the illustration-driven zero state from node 2:10580.
 *
 * Used by both `/` (home) and `/assignments` so the two sidebar nav
 * items land on the same canonical surface.
 */
export function DashboardView() {
  const { fetchAll, bindSocket, byId, order, loaded, loading } =
    useAssignmentsStore();
  const fetchGroups = useGroupsStore((s) => s.fetchAll);
  const groupsLoaded = useGroupsStore((s) => s.loaded);
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<Filters>({
    status: "all",
    range: "all",
  });

  React.useEffect(() => {
    fetchAll();
    bindSocket();
    /* Pre-hydrate groups so AssignmentCard can render group chips on the
       very first paint instead of popping in a moment later. */
    if (!groupsLoaded) fetchGroups();
  }, [fetchAll, bindSocket, fetchGroups, groupsLoaded]);

  const list = order.map((id) => byId[id]).filter(Boolean);

  const filtered = React.useMemo(() => {
    let out = list;

    if (filters.status !== "all") {
      out = out.filter((a) => a.status === filters.status);
    }

    if (filters.range !== "all") {
      const days = filters.range === "7d" ? 7 : 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      out = out.filter((a) => new Date(a.createdAt).getTime() > cutoff);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((a) =>
        [a.title, a.subject, a.classGrade ?? ""].join(" ").toLowerCase().includes(q)
      );
    }

    return out;
  }, [list, filters, query]);

  const activeFilterCount =
    (filters.status !== "all" ? 1 : 0) + (filters.range !== "all" ? 1 : 0);

  const isInitialLoading = !loaded && loading;
  const isEmpty = loaded && list.length === 0;
  const showControls = !isInitialLoading && !isEmpty;

  /* Figma 2:10576 — the 0-state screen has NO page header; the entire
     surface is just the centered illustration + text + CTA. */
  if (isEmpty) {
    return <ZeroState />;
  }

  return (
    <>
      <PageHeader
        title="Assignments"
        subtitle="Manage and create assignments for your classes."
        count={list.length}
      />

      {/* Search + filter row — Figma rule: only render when assignments exist */}
      {showControls && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <FilterButton
            filters={filters}
            onChange={setFilters}
            activeCount={activeFilterCount}
          />

          <div className="relative w-full sm:ml-auto sm:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assignments"
              aria-label="Search assignments"
              className="h-11 w-full rounded-xl border-transparent bg-white pl-11 text-[14px] card-shadow focus-visible:border-[#ff5623] focus-visible:ring-2 focus-visible:ring-[#ff5623]/15"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {isInitialLoading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <NoMatches
          query={query}
          onClear={() => {
            setQuery("");
            setFilters({ status: "all", range: "all" });
          }}
        />
      ) : (
        <>
          {/* Figma 2:9742: 2-column grid (542 px cards), extra bottom padding for sticky CTA */}
          <div className="grid grid-cols-1 gap-4 pb-24 sm:grid-cols-2">
            {filtered.map((a) => (
              <AssignmentCard key={a.id} a={a} />
            ))}
          </div>

          {/* Sticky bottom CTA — Figma 2:10016/17 */}
          <StickyCreateCta />
        </>
      )}
    </>
  );
}

/* ─────────── Sticky bottom "+ Create Assignment" CTA ─────────── */

function StickyCreateCta() {
  return (
    <div
      aria-hidden="false"
      className={cn(
        /* Hidden on mobile — the floating "+" in the bottom tab bar covers
           this affordance and we don't want them to fight for the same pixel. */
        "pointer-events-none fixed bottom-0 left-0 right-0 z-20 hidden items-end justify-center px-3 pb-4 pt-6 lg:flex",
        "bg-gradient-to-t from-white/85 via-white/40 to-transparent backdrop-blur-[2px]",
        "lg:left-[327px] lg:pr-3"
      )}
    >
      <Link
        href="/assignments/new"
        className={cn(
          "pointer-events-auto inline-flex items-center gap-1 rounded-[48px] border-[1.5px] border-[rgba(255,255,255,0.5)] bg-[#181818] px-6 py-3 text-[16px] font-medium tracking-[-0.04em] text-white",
          "shadow-[0_16px_24px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]",
          "transition-transform duration-150 hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
        )}
      >
        <Plus className="h-5 w-5" />
        Create Assignment
      </Link>
    </div>
  );
}

/* ─────────── Filter dropdown ─────────── */

type Filters = {
  status: AssignmentStatus | "all";
  range: "all" | "7d" | "30d";
};

const STATUS_OPTIONS: { value: Filters["status"]; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "processing", label: "Generating" },
  { value: "queued", label: "Queued" },
  { value: "completed", label: "Ready" },
  { value: "failed", label: "Failed" },
];

const RANGE_OPTIONS: { value: Filters["range"]; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

function FilterButton({
  filters,
  onChange,
  activeCount,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  activeCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative self-start" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-[14px] font-medium text-foreground card-shadow",
          "transition-shadow duration-150 hover:card-shadow-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Filter className="h-4 w-4 text-muted-foreground" />
        Filter By
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff5623] px-1.5 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-12 z-30 w-[260px] overflow-hidden rounded-2xl border border-[#ececec] bg-white p-2 shadow-xl"
        >
          <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </div>
          {STATUS_OPTIONS.map((opt) => (
            <FilterOption
              key={opt.value}
              label={opt.label}
              checked={filters.status === opt.value}
              onClick={() => onChange({ ...filters, status: opt.value })}
            />
          ))}
          <div className="my-1 h-px bg-[#f0f0f0]" />
          <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Created
          </div>
          {RANGE_OPTIONS.map((opt) => (
            <FilterOption
              key={opt.value}
              label={opt.label}
              checked={filters.range === opt.value}
              onClick={() => onChange({ ...filters, range: opt.value })}
            />
          ))}
          {activeCount > 0 && (
            <>
              <div className="my-1 h-px bg-[#f0f0f0]" />
              <button
                type="button"
                onClick={() => onChange({ status: "all", range: "all" })}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#ff5623] transition-colors hover:bg-[#fff0ea]"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FilterOption({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors",
        checked ? "bg-[#fafafa] text-foreground" : "text-foreground hover:bg-[#f6f6f6]"
      )}
    >
      <span>{label}</span>
      {checked && <Check className="h-4 w-4 text-[#ff5623]" />}
    </button>
  );
}

/* ─────────── Page header ─────────── */

function PageHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count?: number;
}) {
  return (
    <div className="mb-8 flex items-start gap-3">
      <span className="mt-[10px] h-2 w-2 shrink-0 rounded-full bg-[#ff5623]" />
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-foreground sm:text-[24px]">
            {title}
          </h1>
          {typeof count === "number" && count > 0 && (
            <span className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13.5px] text-muted-foreground sm:text-[14px]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/* ─────────── Zero state — Figma 2:10576 / 2:10577 ───────────
   The whole content surface is just the centered illustration + text +
   CTA. No page header, no search row. Vertical fill of the available
   viewport height under the topbar so the group is dead-center. */

function ZeroState() {
  return (
    <div
      data-figma-node="2:10577"
      /* Mobile (Figma 19:309) keeps the same composition but trims the
         top/bottom padding so the centered group sits visibly above the
         floating tab bar. */
      className="flex min-h-[calc(100vh-128px)] w-full flex-col items-center justify-center gap-6 px-4 pb-24 text-center sm:gap-8 sm:pb-0"
    >
      {/* Inner [illustration + text] group — Figma 2:10579, gap-12 */}
      <div className="flex flex-col items-center gap-3">
        <EmptyIllustration />

        {/* Title + description — Figma 2:10581: max-w 486 px, gap-2 */}
        <div className="flex max-w-[486px] flex-col items-center gap-0.5">
          <h3
            className="text-[20px] font-bold leading-[1.4] tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
            data-figma-node="2:10582"
          >
            No assignments yet
          </h3>
          <p
            className="text-[16px] leading-[1.4] tracking-[-0.04em] text-[rgba(94,94,94,0.8)]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
            data-figma-node="2:10583"
          >
            Create your first assignment to start collecting and grading
            student submissions. You can set up rubrics, define marking
            criteria, and let AI assist with grading.
          </p>
        </div>
      </div>

      {/* Primary button — Figma 2:10584: bg #181818, border 1.5px #ffffff80,
          rounded 48, px-24 py-12, white Medium 16 + plus icon */}
      <Link
        href="/assignments/new"
        data-figma-node="2:10584"
        className={cn(
          "inline-flex items-center gap-1 rounded-[48px] border-[1.5px] border-[rgba(255,255,255,0.5)] bg-[#181818] px-6 py-3 text-[16px] font-medium tracking-[-0.04em] text-white",
          "transition-transform duration-150 hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
        )}
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        <Plus className="h-5 w-5" strokeWidth={2.2} />
        Create Your First Assignment
      </Link>
    </div>
  );
}

/* ─────────── Empty-state illustration — Figma 2:9318 ───────────
   300×300 frame with five layers, z-ordered exactly per Figma:
     1. Background — soft warm circle (240×240, centered)
     2. Page mock  — white card 124.5×155 with 5 information bars
     3. Cloud      — top-right pill
     4. Lens       — magnifying glass with red X, lower-right
     5. Doodles    — sparkle scribbles overlaid on everything
   All sub-element offsets copied verbatim from the Figma frame. */

function EmptyIllustration() {
  /* Figma desktop spec is 300x300 (2:9318) and mobile is 220x220 (I19:312).
     The inner layers all use calc(50% + Xpx) offsets that don't scale with
     the container, so we render at the 300x300 spec and uniformly shrink
     the whole composition down on mobile via a CSS scale transform.
     Ratio: 220 / 300 = 0.7333 — keeps the artwork pixel-perfect at any size. */
  return (
    <div
      data-figma-node="2:9318"
      className="relative size-[220px] shrink-0 sm:size-[300px]"
    >
      <div className="absolute left-1/2 top-1/2 size-[300px] origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.7333] sm:scale-100">
      {/* 1. Background blob — Figma 2:9320 */}
      <Image
        src="/brand/empty-bg.svg"
        alt=""
        width={240}
        height={240}
        priority
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
        data-figma-node="2:9320"
      />

      {/* 2. Page mock — white card + 5 bars (Figma 2:9321) */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: "calc(50% + 1.27px)", top: "calc(50% - 8.93px)" }}
        data-figma-node="2:9321"
      >
        {/* White card — Figma 2:9322 */}
        <div
          className="relative h-[155.029px] w-[124.537px] rounded-[16px] bg-white"
          style={{ boxShadow: "0px 20px 30px 0px rgba(146,146,146,0.19)" }}
          data-figma-node="2:9322"
        />
        {/* Information block — Figma 2:9323: 5 bars filling 121×100, gap-18,
            each bar flex-grow:1 min-h-px → ~9.8 px tall */}
        <div
          className="absolute left-1/2 flex h-[121px] w-[100px] -translate-x-1/2 -translate-y-1/2 flex-col items-start gap-[18px]"
          style={{ top: "calc(50% + 2.99px)" }}
          data-figma-node="2:9323"
        >
          <span className="min-h-px w-[50px] flex-1 rounded-full bg-[#011625]" />
          <span className="min-h-px w-full flex-1 rounded-full bg-[#d4d4d4]" />
          <span className="min-h-px w-full flex-1 rounded-full bg-[#d4d4d4]" />
          <span className="min-h-px w-full flex-1 rounded-full bg-[#d4d4d4]" />
          <span className="min-h-px w-full flex-1 rounded-full bg-[#d4d4d4]" />
        </div>
      </div>

      {/* 3. Cloud — Figma 2:9329, top-right corner */}
      <Image
        src="/brand/empty-cloud.svg"
        alt=""
        width={70}
        height={40}
        priority
        className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
        style={{
          left: "calc(50% + 108.11px)",
          top: "calc(50% - 83.38px)",
        }}
        data-figma-node="2:9329"
      />

      {/* 4. Lens — Figma 2:9334, lower-right with red X */}
      <Image
        src="/brand/empty-lens.svg"
        alt=""
        width={163}
        height={163}
        priority
        className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
        style={{
          left: "calc(50% + 54.16px)",
          top: "calc(50% + 32.15px)",
        }}
        data-figma-node="2:9334"
      />

      {/* 5. Doodles — Figma 2:9343, centered overlay on top of everything */}
      <Image
        src="/brand/empty-doodles.svg"
        alt=""
        width={284}
        height={179}
        priority
        className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
        style={{
          left: "calc(50% - 1px)",
          top: "calc(50% - 0.1px)",
        }}
        data-figma-node="2:9343"
      />
      </div>
    </div>
  );
}

function NoMatches({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white/60 px-6 py-16 text-center backdrop-blur">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f0f0] text-muted-foreground">
        <FileSearch className="h-6 w-6" />
      </div>
      <h3 className="text-[16px] font-semibold text-foreground">
        {query ? `No matches for "${query}"` : "No assignments match these filters"}
      </h3>
      <p className="mt-1 max-w-xs text-[14px] text-muted-foreground">
        Try a different keyword, or clear your filters.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex h-9 items-center rounded-full bg-[#f0f0f0] px-4 text-[13px] font-medium text-foreground transition-colors duration-150 hover:bg-[#e6e6e6]"
      >
        Clear filters
      </button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[162px] animate-pulse rounded-[24px] bg-white/70 card-shadow"
        />
      ))}
    </div>
  );
}
