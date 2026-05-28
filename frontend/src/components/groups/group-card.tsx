"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreVertical, Pencil, Trash2, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";
import { GROUP_COLOR_TOKENS } from "@/lib/types";
import { deleteGroup } from "@/lib/api";
import { useGroupsStore } from "@/store/groups";

/**
 * GroupCard — surfaces a single class/group on the /groups list.
 *
 * Layout mirrors the AssignmentCard rhythm (rounded-24, p-6) but adds a
 * left-edge color swatch so groups read as a distinct list at a glance.
 *   ┌──────────────────────────────────────┐
 *   │ ▌ Class 10A — Physics             ⋮ │
 *   │ ▌ Class 10 • 32 students             │
 *   │ ▌                                    │
 *   │ ▌ 📄 4 assignments     View →        │
 *   └──────────────────────────────────────┘
 */
export function GroupCard({
  g,
  onEdit,
}: {
  g: Group;
  onEdit: (g: Group) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const removeFromStore = useGroupsStore((s) => s.remove);
  const tokens = GROUP_COLOR_TOKENS[g.color] ?? GROUP_COLOR_TOKENS.orange;

  React.useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const msg =
      g.assignmentCount > 0
        ? `Delete "${g.name}"? The ${g.assignmentCount} linked assignment${g.assignmentCount === 1 ? "" : "s"} will be kept but unassigned from this group.`
        : `Delete "${g.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    setBusy(true);
    setMenuOpen(false);
    try {
      await deleteGroup(g.id);
      removeFromStore(g.id);
      toast.success("Group deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  const subtitle = [g.classGrade, g.subject].filter(Boolean).join(" • ");

  return (
    <Link
      href={`/groups/${g.id}`}
      className="group block focus-visible:outline-none"
    >
      <article
        className={cn(
          "relative flex h-[162px] w-full overflow-hidden rounded-[24px] bg-white",
          "transition-shadow duration-150 group-hover:card-shadow-hover",
          "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2"
        )}
      >
        {/* Color swatch — full-height bar on the left, identifies the group at a glance */}
        <span
          aria-hidden
          className="w-2 shrink-0"
          style={{ background: tokens.bg }}
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between p-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="line-clamp-2 text-[22px] font-extrabold leading-[1.2] tracking-[-0.04em] text-[#303030] sm:text-[24px]"
                style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
              >
                {g.name}
              </h3>
              {subtitle && (
                <p className="mt-1 truncate text-[13.5px] text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>

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
                  <button
                    role="menuitem"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit(g);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium text-[#303030] transition-colors duration-100 hover:bg-[#f6f6f6]"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Edit group
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleDelete}
                    disabled={busy}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium text-[#c53535] transition-colors duration-100 hover:bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center gap-4 text-[13.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#a9a9a9]" />
              <span className="font-semibold tabular-nums text-[#303030]">
                {g.assignmentCount}
              </span>
              assignment{g.assignmentCount === 1 ? "" : "s"}
            </span>
            {typeof g.studentCount === "number" && g.studentCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#a9a9a9]" />
                <span className="font-semibold tabular-nums text-[#303030]">
                  {g.studentCount}
                </span>
                student{g.studentCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
