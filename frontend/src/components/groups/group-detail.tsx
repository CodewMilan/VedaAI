"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Users,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Group, GroupWithAssignments, Assignment } from "@/lib/types";
import { GROUP_COLOR_TOKENS } from "@/lib/types";
import {
  assignAssignmentsToGroup,
  deleteGroup,
  getGroup,
  listAssignments,
  unassignAssignmentFromGroup,
} from "@/lib/api";
import { useGroupsStore } from "@/store/groups";
import { AssignmentCard } from "@/components/dashboard/assignment-card";
import { GroupFormDialog } from "./group-form-dialog";

export function GroupDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<GroupWithAssignments | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const removeFromStore = useGroupsStore((s) => s.remove);
  const upsertInStore = useGroupsStore((s) => s.upsert);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getGroup(id);
      setData(d);
      const { assignments: _drop, ...rest } = d;
      void _drop;
      upsertInStore(rest as Group);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id, upsertInStore]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!data) return;
    const msg =
      data.assignments.length > 0
        ? `Delete "${data.name}"? The ${data.assignments.length} linked assignment${data.assignments.length === 1 ? "" : "s"} will be kept but unassigned.`
        : `Delete "${data.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      await deleteGroup(id);
      removeFromStore(id);
      toast.success("Group deleted");
      router.push("/groups");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleUnassign(a: Assignment) {
    if (!data) return;
    if (!confirm(`Remove "${a.title}" from "${data.name}"?`)) return;
    try {
      await unassignAssignmentFromGroup(id, a.id);
      setData({
        ...data,
        assignments: data.assignments.filter((x) => x.id !== a.id),
        assignmentCount: Math.max(0, data.assignmentCount - 1),
      });
      useGroupsStore.getState().bumpAssignmentCount(id, -1);
      toast.success("Removed from group");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/60 px-6 py-16 text-center backdrop-blur">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0ea] text-[#c53535]">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h3 className="text-[16px] font-semibold text-foreground">
          {error ?? "Group not found"}
        </h3>
        <Link
          href="/groups"
          className="mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-[#181818] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#303030]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to groups
        </Link>
      </div>
    );
  }

  const tokens = GROUP_COLOR_TOKENS[data.color];
  const subtitle = [data.classGrade, data.subject].filter(Boolean).join(" • ");

  return (
    <>
      {/* Header card */}
      <header
        className="relative mb-6 overflow-hidden rounded-[24px] bg-white p-6 sm:p-8"
        style={{ boxShadow: `inset 6px 0 0 0 ${tokens.bg}` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-2 w-2 rounded-full"
                style={{ background: tokens.bg }}
              />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Group
              </span>
            </div>
            <h1
              className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#303030] sm:text-[30px]"
              style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
            >
              {data.name}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                {subtitle}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#a9a9a9]" />
                <span className="font-semibold tabular-nums text-foreground">
                  {data.assignmentCount}
                </span>
                assignment{data.assignmentCount === 1 ? "" : "s"}
              </span>
              {typeof data.studentCount === "number" && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#a9a9a9]" />
                  <span className="font-semibold tabular-nums text-foreground">
                    {data.studentCount}
                  </span>
                  student{data.studentCount === 1 ? "" : "s"}
                </span>
              )}
              <span className="text-[12.5px] text-muted-foreground">
                Created {formatDate(data.createdAt)}
              </span>
            </div>

            {data.description && (
              <p className="mt-4 max-w-2xl rounded-xl bg-[#fafafa] p-3 text-[13.5px] leading-relaxed text-muted-foreground">
                {data.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#181818] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#303030]"
            >
              <Plus className="h-4 w-4" />
              Assign papers
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#dcdcdc] bg-white px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-[#f6f6f6]"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#f3c8c8] bg-white px-4 text-[13px] font-medium text-[#c53535] transition-colors hover:bg-[#fdecec]"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Assigned papers */}
      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-[18px] font-bold tracking-[-0.02em] text-foreground">
            Assigned papers
          </h2>
          {data.assignments.length > 0 && (
            <span className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-[11.5px] font-semibold tabular-nums text-muted-foreground">
              {data.assignments.length}
            </span>
          )}
        </div>

        {data.assignments.length === 0 ? (
          <EmptyAssigned onAssign={() => setPickerOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-10 sm:grid-cols-2">
            {data.assignments.map((a) => (
              <div key={a.id} className="relative">
                <AssignmentCard a={a} />
                {/* "Remove from group" affordance — sits in the corner of the card */}
                <button
                  type="button"
                  onClick={() => handleUnassign(a)}
                  aria-label={`Remove ${a.title} from ${data.name}`}
                  title="Remove from group"
                  className="absolute right-3 bottom-3 inline-flex h-7 items-center gap-1 rounded-full bg-white/95 px-2.5 text-[11.5px] font-medium text-muted-foreground opacity-0 shadow-sm transition-all hover:bg-[#fdecec] hover:text-[#c53535] focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" /> Unassign
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <GroupFormDialog
        open={editOpen}
        initial={data}
        onClose={() => setEditOpen(false)}
        onSuccess={(g) => setData({ ...data, ...g })}
      />

      <AssignmentPickerDialog
        open={pickerOpen}
        groupId={id}
        existingIds={new Set(data.assignments.map((a) => a.id))}
        onClose={() => setPickerOpen(false)}
        onAssigned={(newAssignments) => {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  assignments: newAssignments,
                  assignmentCount: newAssignments.length,
                }
              : prev
          );
          useGroupsStore
            .getState()
            .bumpAssignmentCount(
              id,
              newAssignments.length - data.assignments.length
            );
        }}
      />
    </>
  );
}

function EmptyAssigned({ onAssign }: { onAssign: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/60 px-6 py-12 text-center backdrop-blur">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6f6f6] text-muted-foreground">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex max-w-md flex-col items-center gap-1">
        <h3 className="text-[15px] font-semibold text-foreground">
          No papers assigned yet
        </h3>
        <p className="text-[13px] text-muted-foreground">
          Pick from your existing assignments — or create a new one from the
          home page.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onAssign}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#181818] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#303030]"
        >
          <Plus className="h-4 w-4" />
          Assign papers
        </button>
        <Link
          href="/assignments/new"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#dcdcdc] bg-white px-5 text-[13px] font-medium text-foreground transition-colors hover:bg-[#f6f6f6]"
        >
          <Plus className="h-4 w-4" />
          New paper
        </Link>
      </div>
    </div>
  );
}

/* ─────────── Assignment-picker dialog ─────────── */

function AssignmentPickerDialog({
  open,
  groupId,
  existingIds,
  onClose,
  onAssigned,
}: {
  open: boolean;
  groupId: string;
  existingIds: Set<string>;
  onClose: () => void;
  onAssigned: (assignments: Assignment[]) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [all, setAll] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    setPicked(new Set());
    setQuery("");
    setLoading(true);
    listAssignments()
      .then(setAll)
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load")
      )
      .finally(() => setLoading(false));

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
  }, [open, onClose]);

  const candidates = all.filter((a) => !existingIds.has(a.id));
  const filtered = candidates.filter((a) =>
    query.trim()
      ? `${a.title} ${a.subject ?? ""} ${a.classGrade ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      : true
  );

  async function handleSave() {
    if (picked.size === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const res = await assignAssignmentsToGroup(
        groupId,
        Array.from(picked)
      );
      onAssigned(res.assignments);
      toast.success(`Assigned ${picked.size} paper${picked.size === 1 ? "" : "s"}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Assign papers to group"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <div className="relative z-10 flex w-full max-w-[560px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <div>
            <h2 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-foreground">
              Assign papers to this group
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              Pick one or more existing assignments.
            </p>
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

        <div className="border-b border-[#f0f0f0] px-6 py-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, subject…"
            className="block h-10 w-full rounded-xl border border-[#e0e0e0] bg-white px-3.5 text-[13.5px] placeholder:text-muted-foreground focus-visible:border-[#ff5623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623]/15"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center px-6 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              {candidates.length === 0
                ? "Every paper you've created is already assigned to this group."
                : "No papers match your search."}
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {filtered.map((a) => {
                const checked = picked.has(a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      onClick={() => {
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (next.has(a.id)) next.delete(a.id);
                          else next.add(a.id);
                          return next;
                        });
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        checked ? "bg-[#fafafa]" : "hover:bg-[#f6f6f6]"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-foreground">
                          {a.title}
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                          {a.subject}
                          {a.classGrade ? ` • ${a.classGrade}` : ""} •
                          Due {formatDate(a.dueDate)}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
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
          <span className="text-[12.5px] text-muted-foreground">
            {picked.size} selected
          </span>
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
              disabled={saving || picked.size === 0}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#181818] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Assigning…
                </>
              ) : (
                "Assign"
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
