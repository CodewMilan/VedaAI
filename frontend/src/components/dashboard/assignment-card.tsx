"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MoreVertical,
  Trash2,
  Eye,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Assignment } from "@/lib/types";
import { GROUP_COLOR_TOKENS } from "@/lib/types";
import { deleteAssignment, regenerateAssignment } from "@/lib/api";
import { useAssignmentsStore } from "@/store/assignments";
import { useGroupsStore } from "@/store/groups";
import { AssignToGroupsDialog } from "@/components/groups/assign-to-groups-dialog";

const STATUS_META: Record<
  Assignment["status"],
  { label: string; dot: string; text: string; icon: React.ReactNode }
> = {
  draft:      { label: "Draft",      dot: "bg-[#a9a9a9]",                text: "text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  queued:     { label: "Queued",     dot: "bg-[#a9a9a9]",                text: "text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  processing: { label: "Generating", dot: "bg-[#ff5623] animate-pulse",  text: "text-[#ff5623]",        icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed:  { label: "Ready",      dot: "bg-emerald-500",              text: "text-emerald-700",      icon: <CheckCircle2 className="h-3 w-3" /> },
  failed:     { label: "Failed",     dot: "bg-[#c53535]",                text: "text-[#c53535]",        icon: <AlertCircle className="h-3 w-3" /> },
};

/**
 * Assignment card — mirrors Figma node 2:9742 exactly.
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │  Quiz on Electricity        ⋮    │  ← 24 px ExtraBold title + 3-dot menu
 *   │                                  │
 *   │  Assigned on : 20-06-2025  Due : │  ← 16 px row, label ExtraBold + value at 50 % opacity
 *   └──────────────────────────────────┘
 *
 * Menu (open): "View Assignment" + red "Delete".
 * For generating/queued/failed states we surface a small inline status
 * indicator so the user still gets feedback — Figma only documents the
 * "ready" card variant but the data model still needs to communicate
 * those states.
 */
export function AssignmentCard({ a }: { a: Assignment }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<"del" | "regen" | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const meta = STATUS_META[a.status];

  const remove = useAssignmentsStore((s) => s.remove);
  const upsert = useAssignmentsStore((s) => s.upsert);
  const groupsById = useGroupsStore((s) => s.byId);

  /* Resolve assigned-group chips lazily — we don't block render on
     groups being loaded; chips just appear once the store hydrates. */
  const linkedGroups = (a.groupIds ?? [])
    .map((id) => groupsById[id])
    .filter(Boolean);

  React.useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    setBusy("del");
    setMenuOpen(false);
    try {
      await deleteAssignment(a.id);
      remove(a.id);
      toast.success("Assignment deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(null);
    }
  }

  async function onRegen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy("regen");
    setMenuOpen(false);
    try {
      const updated = await regenerateAssignment(a.id);
      upsert(updated);
      toast.success("Regenerating — watch the live progress");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Link
      href={`/assignments/${a.id}`}
      className="group block focus-visible:outline-none"
    >
      <article
        className={cn(
          // Figma: bg-white rounded-[24px] p-[24px] h-[162px]
          "relative flex h-[162px] w-full flex-col justify-between rounded-[24px] bg-white p-6",
          "transition-shadow duration-150 group-hover:card-shadow-hover",
          "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2"
        )}
      >
        {/* ── Header row: title + 3-dot menu ── */}
        <div className="flex items-start justify-between gap-3">
          <h3
            className="line-clamp-2 flex-1 text-[22px] font-extrabold leading-[1.2] tracking-[-0.04em] text-[#303030] sm:text-[24px]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            {a.title}
          </h3>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="-mr-1.5 -mt-1.5 flex h-9 w-9 items-center justify-center rounded-full text-[#303030] transition-colors duration-150 hover:bg-[#f0f0f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="h-[20px] w-[20px]" strokeWidth={2.5} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-10 z-50 min-w-[180px] overflow-hidden rounded-2xl bg-white py-2 shadow-[0_16px_32px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)]"
              >
                <Link
                  href={`/assignments/${a.id}`}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[14px] font-medium text-[#303030] transition-colors duration-100 hover:bg-[#f6f6f6]"
                >
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  View Assignment
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setAssignOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium text-[#303030] transition-colors duration-100 hover:bg-[#f6f6f6]"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Assign to groups…
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={onRegen}
                  disabled={busy !== null || a.status === "processing"}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium text-[#303030] transition-colors duration-100 hover:bg-[#f6f6f6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "regen" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  )}
                  Regenerate
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={onDelete}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium text-[#c53535] transition-colors duration-100 hover:bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "del" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Status indicator + assigned-group chips ──
            For non-completed assignments we show the status line (Figma
            documents only the "ready" variant; statuses still need a UI).
            Completed assignments display group chips instead if any are linked. */}
        {a.status === "processing" ? (
          <div>
            <div className="flex items-center justify-between text-[12px] font-medium">
              <span className="inline-flex items-center gap-1.5 text-[#ff5623]">
                {meta.icon}
                {a.stage ?? "Generating"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {a.progress ?? 10}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f0]">
              <div
                className="h-full rounded-full bg-[#ff5623] transition-all duration-500"
                style={{ width: `${a.progress ?? 10}%` }}
              />
            </div>
          </div>
        ) : a.status !== "completed" ? (
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f6f6f6] px-2.5 py-1 text-[12px] font-medium",
              meta.text
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        ) : linkedGroups.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {linkedGroups.slice(0, 2).map((g) => {
              const t = GROUP_COLOR_TOKENS[g.color];
              return (
                <span
                  key={g.id}
                  className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11.5px] font-medium"
                  style={{ background: t.bgSoft, color: t.fg }}
                  title={g.name}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: t.bg }}
                  />
                  <span className="truncate">{g.name}</span>
                </span>
              );
            })}
            {linkedGroups.length > 2 && (
              <span className="inline-flex items-center rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
                +{linkedGroups.length - 2}
              </span>
            )}
          </div>
        ) : null}

        {/* ── Footer row: Assigned on : DATE · Due : DATE — exact Figma typography ── */}
        <div
          className="flex items-center justify-between text-[14px] tracking-[-0.04em] sm:text-[16px]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          <span className="leading-[1.2] text-[rgba(0,0,0,0.5)]">
            <span className="font-extrabold text-[#303030]">Assigned on</span>
            {" : "}
            {formatDate(a.createdAt)}
          </span>
          {a.dueDate && (
            <span className="leading-[1.2] text-[rgba(0,0,0,0.5)]">
              <span className="font-extrabold text-[#303030]">Due</span>
              {" : "}
              {formatDate(a.dueDate)}
            </span>
          )}
        </div>
      </article>

      <AssignToGroupsDialog
        open={assignOpen}
        assignment={a}
        onClose={() => setAssignOpen(false)}
      />
    </Link>
  );
}
