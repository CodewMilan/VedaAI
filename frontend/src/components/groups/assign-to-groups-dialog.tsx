"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Loader2, X, Users, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Assignment, Group } from "@/lib/types";
import { GROUP_COLOR_TOKENS } from "@/lib/types";
import {
  assignAssignmentsToGroup,
  unassignAssignmentFromGroup,
} from "@/lib/api";
import { useGroupsStore } from "@/store/groups";
import { useAssignmentsStore } from "@/store/assignments";
import { GroupFormDialog } from "./group-form-dialog";

interface AssignToGroupsDialogProps {
  open: boolean;
  assignment: Assignment;
  onClose: () => void;
}

/**
 * AssignToGroupsDialog — multi-select picker for linking an assignment
 * to one or more groups.
 *
 * Computes a diff between the assignment's currently-linked groupIds and
 * the user's new selection, then dispatches `addToSet` / `pull` requests
 * for only the changed groups (idempotent, minimum traffic).
 */
export function AssignToGroupsDialog({
  open,
  assignment,
  onClose,
}: AssignToGroupsDialogProps) {
  const [mounted, setMounted] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { byId, order, loaded, fetchAll } = useGroupsStore();
  const upsertAssignment = useAssignmentsStore((s) => s.upsert);
  const bumpCount = useGroupsStore((s) => s.bumpAssignmentCount);

  React.useEffect(() => setMounted(true), []);

  /* Sync the selection set whenever the dialog opens or the
     assignment's groupIds change underneath us. */
  React.useEffect(() => {
    if (!open) return;
    setSelected(new Set(assignment.groupIds ?? []));
  }, [open, assignment.id, assignment.groupIds]);

  React.useEffect(() => {
    if (!open) return;
    if (!loaded) fetchAll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loaded, fetchAll, onClose]);

  const groups = order.map((id) => byId[id]).filter(Boolean);
  const currentIds = new Set(assignment.groupIds ?? []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    selected.forEach((id) => {
      if (!currentIds.has(id)) toAdd.push(id);
    });
    currentIds.forEach((id) => {
      if (!selected.has(id)) toRemove.push(id);
    });

    if (toAdd.length === 0 && toRemove.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        ...toAdd.map((gid) => assignAssignmentsToGroup(gid, [assignment.id])),
        ...toRemove.map((gid) =>
          unassignAssignmentFromGroup(gid, assignment.id)
        ),
      ]);

      const nextGroupIds = Array.from(selected);
      upsertAssignment({
        ...assignment,
        groupIds: nextGroupIds,
        updatedAt: new Date().toISOString(),
      });
      toAdd.forEach((gid) => bumpCount(gid, +1));
      toRemove.forEach((gid) => bumpCount(gid, -1));

      const summary: string[] = [];
      if (toAdd.length)
        summary.push(`assigned to ${toAdd.length} group${toAdd.length === 1 ? "" : "s"}`);
      if (toRemove.length)
        summary.push(`removed from ${toRemove.length}`);
      toast.success(summary.join(", ") || "Updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !open) return null;

  const hasGroups = groups.length > 0;
  const dirty =
    selected.size !== currentIds.size ||
    Array.from(selected).some((id) => !currentIds.has(id));

  return (
    <>
      {createPortal(
        <div
          /* Stop click bubbling so dialog interactions don't trigger any
             ancestor Link/onClick handlers (assignment cards wrap us in <Link>). */
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Assign to groups"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
          />

          <div className="relative z-10 flex w-full max-w-[480px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0ea] text-[#ff5623]">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-foreground">
                    Assign to groups
                  </h2>
                  <p className="truncate text-[12.5px] text-muted-foreground">
                    {assignment.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#f6f6f6] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[55vh] overflow-y-auto p-3">
              {!loaded ? (
                <div className="flex items-center justify-center px-6 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : !hasGroups ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6f6f6] text-muted-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-[15px] font-semibold text-foreground">
                    No groups yet
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Create your first class to start assigning papers.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#181818] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#303030]"
                  >
                    <Plus className="h-4 w-4" />
                    New group
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {groups.map((g) => {
                    const checked = selected.has(g.id);
                    const tokens = GROUP_COLOR_TOKENS[g.color];
                    const subtitle = [g.classGrade, g.subject]
                      .filter(Boolean)
                      .join(" • ");
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={checked}
                          onClick={() => toggle(g.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            checked ? "bg-[#fafafa]" : "hover:bg-[#f6f6f6]"
                          )}
                        >
                          <span
                            aria-hidden
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ background: tokens.bg }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-semibold text-foreground">
                              {g.name}
                            </div>
                            <div className="truncate text-[12px] text-muted-foreground">
                              {subtitle || `${g.assignmentCount} assignments`}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              checked
                                ? "border-[#ff5623] bg-[#ff5623] text-white"
                                : "border-[#dcdcdc] bg-white"
                            )}
                          >
                            {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-[#f0f0f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-full text-[13px] font-medium text-[#ff5623] transition-colors hover:bg-[#fff0ea] -mx-2 px-3"
              >
                <Plus className="h-4 w-4" />
                New group
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="inline-flex h-10 items-center rounded-full border border-[#dcdcdc] bg-white px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-[#f6f6f6] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#181818] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </footer>
          </div>
        </div>,
        document.body
      )}

      <GroupFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(g) => {
          /* auto-select the new group so the user doesn't have to click it */
          setSelected((prev) => new Set([...prev, g.id]));
        }}
      />
    </>
  );
}
