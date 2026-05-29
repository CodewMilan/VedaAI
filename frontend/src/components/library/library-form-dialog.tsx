"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Loader2, X, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, Textarea } from "@/components/ui/input";
import type {
  CreateLibraryQuestionInput,
  Difficulty,
  LibraryQuestion,
  QuestionType,
} from "@/lib/types";
import {
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
} from "@/lib/types";
import { createLibraryQuestion, updateLibraryQuestion } from "@/lib/api";
import { useLibraryStore } from "@/store/library";

const TYPE_OPTIONS = Object.keys(QUESTION_TYPE_LABELS) as QuestionType[];
const DIFFICULTY_OPTIONS = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

interface LibraryFormDialogProps {
  open: boolean;
  /** When set, the dialog opens in "edit" mode and pre-fills from this row. */
  initial?: LibraryQuestion;
  onClose: () => void;
}

export function LibraryFormDialog({
  open,
  initial,
  onClose,
}: LibraryFormDialogProps) {
  const mode = initial ? "edit" : "create";
  const [mounted, setMounted] = React.useState(false);

  const [text, setText] = React.useState("");
  const [type, setType] = React.useState<QuestionType>("short");
  const [difficulty, setDifficulty] = React.useState<Difficulty>("moderate");
  const [marks, setMarks] = React.useState("1");
  const [subject, setSubject] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [optionsText, setOptionsText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const upsert = useLibraryStore((s) => s.upsert);
  const refetch = useLibraryStore((s) => s.fetch);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    setText(initial?.text ?? "");
    setType(initial?.type ?? "short");
    setDifficulty(initial?.difficulty ?? "moderate");
    setMarks(initial?.marks != null ? String(initial.marks) : "1");
    setSubject(initial?.subject ?? "");
    setTopic(initial?.topic ?? "");
    setAnswer(initial?.answer ?? "");
    setOptionsText((initial?.options ?? []).join("\n"));
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
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Question text is required");
      return;
    }
    const options =
      type === "mcq"
        ? optionsText
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    const payload: CreateLibraryQuestionInput = {
      text: trimmed,
      type,
      difficulty,
      marks: Number(marks) || 0,
      options: options && options.length ? options : undefined,
      answer: answer.trim() || undefined,
      subject: subject.trim() || undefined,
      topic: topic.trim() || undefined,
    };

    setSaving(true);
    try {
      const saved = initial
        ? await updateLibraryQuestion(initial.id, payload)
        : await createLibraryQuestion(payload);
      upsert(saved);
      /* Refresh facet counts (subject/type tallies may have shifted). */
      refetch();
      toast.success(mode === "edit" ? "Question updated" : "Saved to library");
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
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "edit" ? "Edit question" : "Add question"}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
      />

      <div className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0ea] text-[#ff5623]">
              <BookMarked className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-foreground">
                {mode === "edit" ? "Edit question" : "Add question"}
              </h2>
              <p className="text-[12.5px] text-muted-foreground">
                Build up a reusable bank you can pull from anytime.
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

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6">
          <div className="space-y-4">
            <Field label="Question" required htmlFor="lib-text">
              <Textarea
                id="lib-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. State and explain Newton's second law of motion."
                maxLength={2000}
                rows={3}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="lib-type">
                <Select
                  id="lib-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as QuestionType)}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Difficulty" htmlFor="lib-diff">
                <Select
                  id="lib-diff"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {type === "mcq" && (
              <Field label="Options (one per line)" htmlFor="lib-options">
                <Textarea
                  id="lib-options"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder={"Option A\nOption B\nOption C\nOption D"}
                  rows={4}
                />
              </Field>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Subject" htmlFor="lib-subject">
                <Input
                  id="lib-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Physics"
                  maxLength={100}
                />
              </Field>
              <Field label="Topic" htmlFor="lib-topic">
                <Input
                  id="lib-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Mechanics"
                  maxLength={80}
                />
              </Field>
              <Field label="Marks" htmlFor="lib-marks">
                <Input
                  id="lib-marks"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  inputMode="decimal"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="1"
                />
              </Field>
            </div>

            <Field label="Model answer / key" htmlFor="lib-answer">
              <Textarea
                id="lib-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Optional — the expected answer or marking key"
                maxLength={2000}
                rows={2}
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
                "Add to library"
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}

function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-11 w-full appearance-none rounded-xl border border-input bg-white px-4 text-[14px] text-foreground",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:border-[#ff5623] focus-visible:ring-2 focus-visible:ring-[#ff5623]/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
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
