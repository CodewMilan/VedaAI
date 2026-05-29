"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Difficulty, LibraryQuestion, QuestionType } from "@/lib/types";
import { QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from "@/lib/types";
import { deleteLibraryQuestion } from "@/lib/api";
import { useLibraryStore } from "@/store/library";

const TYPE_TINT: Record<QuestionType, { bg: string; fg: string }> = {
  mcq: { bg: "#eef2ff", fg: "#4338ca" },
  short: { bg: "#ecfdf5", fg: "#047857" },
  long: { bg: "#fef3f2", fg: "#b42318" },
  true_false: { bg: "#fdf4ff", fg: "#a21caf" },
  fill_blank: { bg: "#fffbeb", fg: "#b45309" },
  diagram: { bg: "#eff6ff", fg: "#1d4ed8" },
  numerical: { bg: "#f0fdfa", fg: "#0f766e" },
};

const DIFFICULTY_TINT: Record<Difficulty, { bg: string; fg: string }> = {
  easy: { bg: "#e7f7ed", fg: "#166534" },
  moderate: { bg: "#fef6dc", fg: "#854d0e" },
  hard: { bg: "#fdecec", fg: "#b42318" },
};

export function LibraryQuestionCard({
  q,
  onEdit,
}: {
  q: LibraryQuestion;
  onEdit: (q: LibraryQuestion) => void;
}) {
  const remove = useLibraryStore((s) => s.remove);
  const refetch = useLibraryStore((s) => s.fetch);
  const [copied, setCopied] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const typeTint = TYPE_TINT[q.type];
  const diffTint = DIFFICULTY_TINT[q.difficulty];

  const onCopy = async () => {
    const parts = [q.text];
    if (q.options?.length) {
      parts.push(
        q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n")
      );
    }
    if (q.answer) parts.push(`Answer: ${q.answer}`);
    try {
      await navigator.clipboard.writeText(parts.join("\n\n"));
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const onDelete = async () => {
    if (!confirm("Remove this question from your library?")) return;
    setDeleting(true);
    /* Optimistic: drop it immediately, restore on failure. */
    remove(q.id);
    try {
      await deleteLibraryQuestion(q.id);
      toast.success("Removed");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      refetch();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group flex flex-col gap-3 rounded-[20px] bg-white p-5 card-shadow transition-shadow duration-150 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip bg={typeTint.bg} fg={typeTint.fg}>
          {QUESTION_TYPE_LABELS[q.type].replace(/ Questions?$/, "")}
        </Chip>
        <Chip bg={diffTint.bg} fg={diffTint.fg}>
          {DIFFICULTY_LABELS[q.difficulty]}
        </Chip>
        {q.subject && (
          <Chip bg="#f0f0f0" fg="#5e5e5e">
            {q.subject}
          </Chip>
        )}
        {q.topic && (
          <Chip bg="#f0f0f0" fg="#5e5e5e">
            {q.topic}
          </Chip>
        )}
        <span className="ml-auto shrink-0 text-[12px] font-semibold tabular-nums text-muted-foreground">
          {q.marks} {q.marks === 1 ? "mark" : "marks"}
        </span>
      </div>

      {/* Question text */}
      <p className="text-[14.5px] leading-[1.5] tracking-[-0.01em] text-[#303030]">
        {q.text}
      </p>

      {/* MCQ options preview */}
      {q.options && q.options.length > 0 && (
        <ul className="flex flex-col gap-1">
          {q.options.map((o, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
              <span className="font-semibold text-[#5e5e5e]">
                {String.fromCharCode(65 + i)}.
              </span>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Answer */}
      {q.answer && (
        <p className="rounded-xl bg-[#f9f9f9] px-3 py-2 text-[13px] leading-[1.5] text-[#5e5e5e]">
          <span className="font-semibold text-[#303030]">Answer:</span>{" "}
          {q.answer}
        </p>
      )}

      {/* Footer: source + actions */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-[#f4f4f4] pt-3">
        {q.sourceTitle ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">From “{q.sourceTitle}”</span>
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground">Manually added</span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          <IconButton label="Copy question" onClick={onCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-[#16a34a]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </IconButton>
          <IconButton label="Edit question" onClick={() => onEdit(q)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete question" onClick={onDelete} danger>
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function Chip({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-100",
        danger ? "hover:bg-[#fdecec] hover:text-[#c53535]" : "hover:bg-[#f4f4f4] hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      )}
    >
      {children}
    </button>
  );
}
