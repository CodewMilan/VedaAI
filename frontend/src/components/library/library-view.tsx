"use client";

import * as React from "react";
import {
  Plus,
  Search,
  BookMarked,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Difficulty,
  LibraryQuestion,
  QuestionType,
} from "@/lib/types";
import { QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from "@/lib/types";
import { useLibraryStore } from "@/store/library";
import { LibraryQuestionCard } from "@/components/library/library-question-card";
import { LibraryFormDialog } from "@/components/library/library-form-dialog";

export function LibraryView() {
  const {
    items,
    facets,
    query,
    loaded,
    loading,
    error,
    fetch,
    setQuery,
  } = useLibraryStore();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LibraryQuestion | null>(null);
  const [searchInput, setSearchInput] = React.useState(query.q ?? "");

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  /* Debounce the search box → store query. */
  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((query.q ?? "") !== searchInput) {
        setQuery({ q: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const isInitialLoading = !loaded && loading;
  const hasFilters = Boolean(
    query.q || query.subject || query.type || query.difficulty
  );
  const isEmpty = loaded && items.length === 0 && !hasFilters;
  const isNoResults = loaded && items.length === 0 && hasFilters;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchInput("");
    useLibraryStore.setState({ query: {} });
    fetch({});
  };

  return (
    <>
      <PageHeader
        count={facets.total}
        onCreate={openCreate}
      />

      {!isEmpty && !isInitialLoading && (
        <Toolbar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          query={query}
          facets={facets}
          setQuery={setQuery}
          hasFilters={hasFilters}
          onClear={clearFilters}
          loading={loading}
        />
      )}

      {isInitialLoading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorPanel message={error} onRetry={() => fetch()} />
      ) : isEmpty ? (
        <EmptyLibrary onCreate={openCreate} />
      ) : isNoResults ? (
        <NoResults onClear={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 pb-10 lg:grid-cols-2">
          {items.map((q) => (
            <LibraryQuestionCard
              key={q.id}
              q={q}
              onEdit={(question) => {
                setEditing(question);
                setDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <LibraryFormDialog
        open={dialogOpen}
        initial={editing ?? undefined}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

/* ─────────── header ─────────── */

function PageHeader({
  count,
  onCreate,
}: {
  count: number;
  onCreate: () => void;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="mt-[10px] h-2 w-2 shrink-0 rounded-full bg-[#ff5623]" />
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-foreground sm:text-[24px]">
            My Library
          </h1>
          {count > 0 && (
            <span className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13.5px] text-muted-foreground sm:text-[14px]">
          Your personal question bank — save the best questions once, reuse them
          across any paper.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full bg-[#181818] px-5 text-[14px] font-medium text-white",
          "transition-colors duration-150 hover:bg-[#303030]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Plus className="h-4 w-4" />
        Add question
      </button>
    </div>
  );
}

/* ─────────── toolbar (search + filters) ─────────── */

function Toolbar({
  searchInput,
  setSearchInput,
  query,
  facets,
  setQuery,
  hasFilters,
  onClear,
  loading,
}: {
  searchInput: string;
  setSearchInput: (v: string) => void;
  query: ReturnType<typeof useLibraryStore.getState>["query"];
  facets: ReturnType<typeof useLibraryStore.getState>["facets"];
  setQuery: ReturnType<typeof useLibraryStore.getState>["setQuery"];
  hasFilters: boolean;
  onClear: () => void;
  loading: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search questions, answers, topics…"
          className="h-11 w-full rounded-full border border-input bg-white pl-11 pr-10 text-[14px] text-foreground placeholder:text-[#a9a9a9] transition-colors duration-150 focus-visible:border-[#ff5623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623]/15"
        />
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : searchInput ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearchInput("")}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-[#f0f0f0]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {facets.types.length > 0 && (
          <FilterDropdown
            label="Type"
            value={query.type}
            options={facets.types.map((f) => ({
              value: f.value,
              label: QUESTION_TYPE_LABELS[f.value as QuestionType].replace(
                / Questions?$/,
                ""
              ),
              count: f.count,
            }))}
            onSelect={(v) =>
              setQuery({ type: (v as QuestionType) || undefined })
            }
          />
        )}
        {facets.difficulties.length > 0 && (
          <FilterDropdown
            label="Difficulty"
            value={query.difficulty}
            options={facets.difficulties.map((f) => ({
              value: f.value,
              label: DIFFICULTY_LABELS[f.value as Difficulty],
              count: f.count,
            }))}
            onSelect={(v) =>
              setQuery({ difficulty: (v as Difficulty) || undefined })
            }
          />
        )}
        {facets.subjects.length > 0 && (
          <FilterDropdown
            label="Subject"
            value={query.subject}
            options={facets.subjects.map((f) => ({
              value: f.value,
              label: f.value,
              count: f.count,
            }))}
            onSelect={(v) => setQuery({ subject: v || undefined })}
          />
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-[#ff5623] transition-colors hover:bg-[#fff0ea]"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value?: string;
  options: { value: string; label: string; count: number }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const active = value ? options.find((o) => o.value === value) : null;

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
          active
            ? "border-transparent bg-[#181818] text-white"
            : "border-[#e4e4e4] bg-white text-foreground hover:bg-[#f6f6f6]"
        )}
      >
        {active ? active.label : label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={cn("transition-transform", open && "rotate-180")}
          fill="none"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-50 min-w-[200px] overflow-hidden rounded-2xl bg-white py-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.16),0_4px_8px_rgba(0,0,0,0.08)]">
          {active && (
            <button
              type="button"
              onClick={() => {
                onSelect("");
                setOpen(false);
              }}
              className="flex w-full items-center px-4 py-2 text-left text-[13.5px] font-medium text-[#ff5623] hover:bg-[#fff7f3]"
            >
              All {label.toLowerCase()}s
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onSelect(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[13.5px] transition-colors hover:bg-[#f6f6f6]",
                value === o.value
                  ? "font-semibold text-foreground"
                  : "text-[#303030]"
              )}
            >
              <span className="truncate">{o.label}</span>
              <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">
                {o.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── empty / error / skeleton states ─────────── */

function EmptyLibrary({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-300px)] w-full flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#fff0ea] text-[#ff5623]">
          <BookMarked className="h-9 w-9" strokeWidth={1.8} />
        </div>
        <div className="flex max-w-[480px] flex-col items-center gap-1">
          <h3
            className="text-[20px] font-bold leading-[1.4] tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Your library is empty
          </h3>
          <p
            className="text-[16px] leading-[1.4] tracking-[-0.04em] text-[rgba(94,94,94,0.8)]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Save standout questions straight from any generated paper, or add
            your own. Build a bank you can search, filter, and reuse forever.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "inline-flex items-center gap-1 rounded-[48px] border-[1.5px] border-[rgba(255,255,255,0.5)] bg-[#181818] px-6 py-3 text-[16px] font-medium tracking-[-0.04em] text-white",
          "transition-transform duration-150 hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
        )}
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        <Plus className="h-5 w-5" strokeWidth={2.2} />
        Add your first question
      </button>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f0f0] text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div className="flex max-w-[380px] flex-col items-center gap-1">
        <h3 className="text-[17px] font-bold tracking-[-0.02em] text-foreground">
          No matching questions
        </h3>
        <p className="text-[14px] text-muted-foreground">
          Try a different search term or clear your filters.
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-10 items-center rounded-full bg-[#181818] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#303030]"
      >
        Clear filters
      </button>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/60 px-6 py-16 text-center backdrop-blur">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0ea] text-[#c53535]">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-[16px] font-semibold text-foreground">
        Couldn&rsquo;t load your library
      </h3>
      <p className="max-w-md text-[13.5px] text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex h-10 items-center rounded-full bg-[#181818] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#303030]"
      >
        Try again
      </button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[150px] animate-pulse rounded-[20px] bg-white/70 card-shadow"
        >
          <Loader2 className="sr-only" />
        </div>
      ))}
    </div>
  );
}
