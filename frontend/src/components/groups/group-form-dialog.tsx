"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Loader2, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, Textarea } from "@/components/ui/input";
import type { Group, GroupColor, CreateGroupInput } from "@/lib/types";
import { GROUP_COLOR_TOKENS, GROUP_COLOR_LABELS } from "@/lib/types";
import { createGroup, updateGroup } from "@/lib/api";
import { useGroupsStore } from "@/store/groups";

const COLORS: GroupColor[] = ["orange", "blue", "green", "purple", "pink", "yellow"];

interface GroupFormDialogProps {
  open: boolean;
  /** When set, the dialog opens in "edit" mode and pre-fills from this group. */
  initial?: Group;
  onClose: () => void;
  onSuccess?: (g: Group) => void;
}

export function GroupFormDialog({
  open,
  initial,
  onClose,
  onSuccess,
}: GroupFormDialogProps) {
  const mode = initial ? "edit" : "create";
  const [mounted, setMounted] = React.useState(false);

  const [name, setName] = React.useState(initial?.name ?? "");
  const [classGrade, setClassGrade] = React.useState(initial?.classGrade ?? "");
  const [section, setSection] = React.useState(initial?.section ?? "");
  const [subject, setSubject] = React.useState(initial?.subject ?? "");
  const [studentCount, setStudentCount] = React.useState<string>(
    initial?.studentCount != null ? String(initial.studentCount) : ""
  );
  const [color, setColor] = React.useState<GroupColor>(initial?.color ?? "orange");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [saving, setSaving] = React.useState(false);

  const upsert = useGroupsStore((s) => s.upsert);

  React.useEffect(() => setMounted(true), []);

  /* Reset form whenever the dialog (re)opens with a new initial group */
  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setClassGrade(initial?.classGrade ?? "");
    setSection(initial?.section ?? "");
    setSubject(initial?.subject ?? "");
    setStudentCount(
      initial?.studentCount != null ? String(initial.studentCount) : ""
    );
    setColor(initial?.color ?? "orange");
    setDescription(initial?.description ?? "");
  }, [open, initial]);

  React.useEffect(() => {
    if (!open) return;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Group name is required");
      return;
    }
    const payload: CreateGroupInput = {
      name: trimmed,
      classGrade: classGrade.trim() || undefined,
      section: section.trim() || undefined,
      subject: subject.trim() || undefined,
      studentCount: studentCount.trim()
        ? Number(studentCount.trim())
        : undefined,
      color,
      description: description.trim() || undefined,
    };
    if (
      payload.studentCount != null &&
      (Number.isNaN(payload.studentCount) || payload.studentCount < 0)
    ) {
      toast.error("Student count must be a positive number");
      return;
    }
    setSaving(true);
    try {
      const saved = initial
        ? await updateGroup(initial.id, payload)
        : await createGroup(payload);
      upsert(saved);
      toast.success(mode === "edit" ? "Group updated" : "Group created");
      onSuccess?.(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      /* Stop click bubbling so dialog interactions don't trigger any
         ancestor Link/onClick handlers when this dialog is mounted
         inside a clickable card. */
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "edit" ? "Edit group" : "Create group"}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
      />

      <div className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0ea] text-[#ff5623]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-foreground">
                {mode === "edit" ? "Edit group" : "New group"}
              </h2>
              <p className="text-[12.5px] text-muted-foreground">
                Organise a class you teach.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#f6f6f6] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6">
          <div className="space-y-4">
            <Field label="Group name" required htmlFor="group-name">
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Class 10A — Physics"
                maxLength={80}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Class / Grade" htmlFor="group-class">
                <Input
                  id="group-class"
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value)}
                  placeholder="Class 10"
                  maxLength={30}
                />
              </Field>
              <Field label="Section" htmlFor="group-section">
                <Input
                  id="group-section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="A"
                  maxLength={10}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject" htmlFor="group-subject">
                <Input
                  id="group-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Physics"
                  maxLength={80}
                />
              </Field>
              <Field label="Students" htmlFor="group-count">
                <Input
                  id="group-count"
                  type="number"
                  min={0}
                  max={1000}
                  inputMode="numeric"
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                  placeholder="32"
                />
              </Field>
            </div>

            <Field label="Color" htmlFor="">
              <div className="flex gap-2">
                {COLORS.map((c) => {
                  const t = GROUP_COLOR_TOKENS[c];
                  const selected = color === c;
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={`Color ${GROUP_COLOR_LABELS[c]}`}
                      aria-pressed={selected}
                      className={cn(
                        "relative h-9 w-9 rounded-full transition-transform duration-150 hover:scale-110",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected && "scale-110"
                      )}
                      style={{ background: t.bg }}
                    >
                      {selected && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full ring-[3px] ring-white ring-offset-2 ring-offset-[#fafafa]"
                          style={{ boxShadow: `inset 0 0 0 2px ${t.bg}` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Notes" htmlFor="group-notes">
              <Textarea
                id="group-notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional — anything that helps you remember this class"
                maxLength={280}
                rows={3}
              />
            </Field>
          </div>

          <footer className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0f0f0] pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center rounded-full border border-[#dcdcdc] bg-white px-5 text-[14px] font-medium text-foreground transition-colors hover:bg-[#f6f6f6] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#181818] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : mode === "edit" ? (
                "Save changes"
              ) : (
                "Create group"
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-medium text-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-[#c53535]">*</span>}
      </label>
      {children}
    </div>
  );
}
