"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  RefreshCw,
  Trash2,
  Loader2,
  Printer,
  MoreVertical,
  BookMarked,
} from "lucide-react";
import {
  bulkSaveLibraryQuestions,
  deleteAssignment,
  regenerateAssignment,
} from "@/lib/api";
import { useAssignmentsStore } from "@/store/assignments";
import { useLibraryStore } from "@/store/library";
import { useUser, userDisplay } from "@/lib/auth/use-user";
import type { Assignment, CreateLibraryQuestionInput } from "@/lib/types";

interface ActionBarProps {
  assignment: Assignment;
}

/**
 * Figma node 2:10683 — the "AI chat header" that sits on top of the paper.
 *
 * Dark translucent card, rounded-32, containing:
 *   • A short AI greeting addressed to the user
 *   • A single white "Download as PDF" pill button (primary CTA)
 *   • A muted 3-dot menu on the right for Regenerate / Print / Delete —
 *     not in Figma, but kept reachable so the page stays self-contained.
 */
export function ActionBar({ assignment }: ActionBarProps) {
  const router = useRouter();
  const { user } = useUser();
  const display = userDisplay(user);
  const firstName = display.name.split(/\s+/)[0];

  const upsert = useAssignmentsStore((s) => s.upsert);
  const remove = useAssignmentsStore((s) => s.remove);
  const refetchLibrary = useLibraryStore((s) => s.fetch);

  const [busy, setBusy] = React.useState<
    "regen" | "del" | "pdf" | "lib" | null
  >(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

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

  const onRegenerate = async () => {
    setBusy("regen");
    setMenuOpen(false);
    try {
      const updated = await regenerateAssignment(assignment.id);
      upsert(updated);
      toast.success("Regenerating — watch the live progress");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const onPrint = () => {
    setMenuOpen(false);
    window.print();
  };

  const onPDF = async () => {
    setBusy("pdf");
    try {
      const html2pdf = (await import("@/lib/pdfExport")).exportPaperToPdf;
      await html2pdf({
        elementId: "paper-root",
        filename: `${slug(assignment.title)}.pdf`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setBusy(null);
    }
  };

  const onSaveToLibrary = async () => {
    setMenuOpen(false);
    const paper = assignment.result;
    if (!paper) return;
    const questions: CreateLibraryQuestionInput[] = [];
    for (const section of paper.sections) {
      for (const q of section.questions) {
        questions.push({
          text: q.text,
          type: q.type,
          difficulty: q.difficulty,
          marks: q.marks,
          options: q.options,
          answer: q.answer,
          subject: paper.meta.subject || assignment.subject || undefined,
          sourceAssignmentId: assignment.id,
          sourceTitle: assignment.title,
        });
      }
    }
    if (!questions.length) {
      toast.error("Nothing to save yet");
      return;
    }
    setBusy("lib");
    try {
      const res = await bulkSaveLibraryQuestions(questions);
      refetchLibrary();
      if (res.insertedCount === 0) {
        toast.success("Already in your library");
      } else {
        toast.success(
          `Saved ${res.insertedCount} question${res.insertedCount === 1 ? "" : "s"} to your library` +
            (res.skipped ? ` · ${res.skipped} already saved` : "")
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    setMenuOpen(false);
    if (!confirm("Delete this assignment? This cannot be undone.")) return;
    setBusy("del");
    try {
      await deleteAssignment(assignment.id);
      remove(assignment.id);
      toast.success("Deleted");
      router.push("/assignments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const ready = assignment.status === "completed" && !!assignment.result;
  const greeting = buildGreeting(firstName, assignment);

  return (
    <div
      className="no-print relative flex flex-col items-stretch gap-4 rounded-[32px] bg-[rgba(24,24,24,0.8)] px-6 py-6 sm:px-8 sm:py-7"
      data-figma-node="2:10683"
    >
      {/* ── Greeting ── */}
      <p
        className="text-[16px] font-bold leading-[1.4] tracking-[-0.04em] text-white sm:text-[20px]"
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        {greeting}
      </p>

      {/* ── Actions ── */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onPDF}
          disabled={!ready || busy !== null}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-6 text-[16px] font-medium tracking-[-0.04em] text-[#303030] transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          {busy === "pdf" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" strokeWidth={2.2} />
          )}
          Download as PDF
        </button>

        {/* Secondary menu — Regenerate / Print / Delete */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={busy !== null}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More actions"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <MoreVertical className="h-5 w-5" strokeWidth={2.2} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-50 min-w-[200px] overflow-hidden rounded-2xl bg-white py-2 shadow-[0_16px_32px_rgba(0,0,0,0.16),0_4px_8px_rgba(0,0,0,0.08)]"
            >
              <MenuItem
                onClick={onSaveToLibrary}
                disabled={!ready || busy !== null}
                icon={
                  busy === "lib" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BookMarked className="h-4 w-4" />
                  )
                }
                label="Save to Library"
              />
              <MenuItem
                onClick={onRegenerate}
                disabled={busy !== null || assignment.status === "processing"}
                icon={
                  busy === "regen" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )
                }
                label="Regenerate"
              />
              <MenuItem
                onClick={onPrint}
                disabled={!ready || busy !== null}
                icon={<Printer className="h-4 w-4" />}
                label="Print"
              />
              <MenuItem
                onClick={onDelete}
                disabled={busy !== null}
                icon={
                  busy === "del" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )
                }
                label="Delete"
                variant="danger"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── helpers ─────────── */

function MenuItem({
  onClick,
  icon,
  label,
  disabled = false,
  variant = "default",
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "danger"
          ? "flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium text-[#c53535] transition-colors duration-100 hover:bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-50"
          : "flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium text-[#303030] transition-colors duration-100 hover:bg-[#f6f6f6] disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      <span
        className={
          variant === "danger" ? "text-[#c53535]" : "text-muted-foreground"
        }
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

function buildGreeting(firstName: string, a: Assignment): string {
  const subj = a.subject?.trim();
  const cls = a.classGrade?.trim();
  const audience = [cls, subj].filter(Boolean).join(" ");

  if (audience) {
    return `Certainly, ${firstName}! Here is your customized Question Paper for ${audience} classes:`;
  }
  return `Certainly, ${firstName}! Here is your customized Question Paper:`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
