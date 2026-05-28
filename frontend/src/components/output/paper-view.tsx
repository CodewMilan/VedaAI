"use client";

import * as React from "react";
import type {
  Assignment,
  Difficulty,
  GeneratedPaper,
  Question,
} from "@/lib/types";
import { useUser, userDisplay } from "@/lib/auth/use-user";
import { cn } from "@/lib/utils";

interface PaperViewProps {
  assignment: Assignment;
  paper: GeneratedPaper;
}

/**
 * Figma node 2:10694 — the "white paper" sheet inside the dark output container.
 *
 * Centered school-name format, all type set in Inter (serif feel for institutional
 * exam papers), generous vertical rhythm, blank student fields up top, then the
 * paper sections, and finally an Answer Key block at the bottom.
 */
export function PaperView({ assignment, paper }: PaperViewProps) {
  const { user } = useUser();
  const display = userDisplay(user);
  const schoolName = display.school || "Educator";

  const totalMarks =
    paper.meta.totalMarks ||
    paper.sections.reduce(
      (s, sec) => s + sec.questions.reduce((q, x) => q + x.marks, 0),
      0
    );

  return (
    <article
      id="paper-root"
      className="paper-page print-page flex w-full flex-col items-stretch gap-6 rounded-[32px] bg-white p-6 font-sans sm:p-10"
      data-figma-node="2:10694"
    >
      {/* ── Header: school + subject + class ── */}
      <header className="text-center">
        <h1
          className="text-[24px] font-bold leading-[1.6] tracking-[-0.03em] text-[#303030] sm:text-[32px]"
          style={{ fontVariationSettings: "'opsz' 32" }}
        >
          {schoolName}
        </h1>
        <p className="text-[18px] font-semibold leading-[1.6] tracking-[-0.03em] text-[#303030] sm:text-[24px]">
          Subject: {paper.meta.subject ?? assignment.subject}
        </p>
        {(paper.meta.classGrade ?? assignment.classGrade) && (
          <p className="text-[18px] font-semibold leading-[1.6] tracking-[-0.03em] text-[#303030] sm:text-[24px]">
            Class: {paper.meta.classGrade ?? assignment.classGrade}
          </p>
        )}
      </header>

      {/* ── Time / Marks row ── */}
      <div className="flex flex-col items-start justify-between gap-1 text-[16px] font-semibold tracking-[-0.03em] text-[#303030] sm:flex-row sm:items-center sm:text-[18px]">
        {paper.meta.duration && (
          <p className="leading-[1.6]">Time Allowed: {paper.meta.duration}</p>
        )}
        <p className="leading-[1.6]">Maximum Marks: {totalMarks}</p>
      </div>

      {/* ── General instruction ── */}
      {paper.meta.generalInstructions?.length ? (
        <ul className="space-y-1 text-[16px] font-semibold tracking-[-0.03em] text-[#303030] sm:text-[18px]">
          {paper.meta.generalInstructions.map((instr, i) => (
            <li key={i} className="leading-[1.6]">
              {instr}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[16px] font-semibold leading-[1.6] tracking-[-0.03em] text-[#303030] sm:text-[18px]">
          All questions are compulsory unless stated otherwise.
        </p>
      )}

      {/* ── Student info: blank fillable rows ── */}
      <div className="space-y-0.5 text-[16px] font-semibold tracking-[-0.03em] text-[#303030] sm:text-[18px]">
        <p className="leading-[1.6]">Name: ______________________</p>
        <p className="leading-[1.6]">Roll Number: ________________</p>
        <p className="leading-[1.6]">
          Class: {paper.meta.classGrade ?? assignment.classGrade ?? "______"}
          {" "}Section: __________
        </p>
      </div>

      {/* ── Sections ── */}
      {paper.sections.map((section, idx) => (
        <SectionBlock
          key={section.id ?? idx}
          section={section}
          sectionLabel={sectionLabel(idx)}
        />
      ))}

      {/* ── End of paper ── */}
      <p className="text-[16px] font-bold leading-[2.4] text-[#303030]">
        End of Question Paper
      </p>

      {/* ── Answer key ── */}
      {paper.sections.some((s) => s.questions.some((q) => q.answer)) && (
        <AnswerKey paper={paper} />
      )}
    </article>
  );
}

/* ─────────── pieces ─────────── */

function SectionBlock({
  section,
  sectionLabel,
}: {
  section: GeneratedPaper["sections"][number];
  sectionLabel: string;
}) {
  return (
    <section className="flex flex-col items-stretch gap-4 print-section">
      <h2 className="text-center text-[20px] font-semibold leading-[1.6] tracking-[-0.03em] text-[#303030] sm:text-[24px]">
        Section {sectionLabel}
      </h2>
      <div>
        <p className="text-[16px] font-semibold leading-[1.6] tracking-[-0.03em] text-[#303030] sm:text-[18px]">
          {section.title}
        </p>
        {section.instruction && (
          <p className="text-[14px] italic leading-[1.6] tracking-[-0.03em] text-[#303030] sm:text-[16px]">
            {section.instruction}
          </p>
        )}
      </div>
      <ol className="list-decimal space-y-1 pl-6 text-[14px] leading-[2.4] tracking-[-0.03em] text-[#303030] sm:text-[16px]">
        {section.questions.map((q) => (
          <QuestionBlock key={q.number} q={q} />
        ))}
      </ol>
    </section>
  );
}

function QuestionBlock({ q }: { q: Question }) {
  return (
    <li className="break-inside-avoid">
      <span>
        [{difficultyLabel(q.difficulty)}] {q.text} [{q.marks}{" "}
        {q.marks === 1 ? "Mark" : "Marks"}]
      </span>

      {/* MCQ options */}
      {q.options && q.options.length > 0 && (
        <ol className="mt-1 space-y-0.5 pl-6 text-[14px] leading-[1.8] sm:text-[16px]">
          {q.options.map((opt, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-[#5e5e5e]">
                {String.fromCharCode(65 + i)}.
              </span>
              <span>{opt}</span>
            </li>
          ))}
        </ol>
      )}

      {/* True / False bubbles */}
      {q.type === "true_false" && (
        <div className="mt-1 flex gap-6 pl-6 text-[14px] text-[#5e5e5e] sm:text-[16px]">
          <span>○ True</span>
          <span>○ False</span>
        </div>
      )}

      {/* Fill-in-the-blank underline */}
      {q.type === "fill_blank" && !q.options && (
        <div className="mt-1 ml-6 inline-block min-w-[160px] border-b-2 border-dashed border-[#303030]/40" />
      )}

      {/* Diagram / graph placeholder frame */}
      {q.type === "diagram" && (
        <div className="mt-3 ml-6 mb-1">
          <div
            className={cn(
              "flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-lg",
              "border-2 border-dashed border-[#303030]/25 bg-[#fafafa]",
              "print:border-solid print:border-[#303030]/40 print:bg-transparent print:min-h-[180px]"
            )}
          >
            {/* Simple graph icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-[#303030]/25 print:text-[#303030]/30"
              aria-hidden="true"
            >
              {/* axes */}
              <polyline points="3 3 3 21 21 21" />
              {/* bar chart bars */}
              <rect x="6"  y="14" width="3" height="7" rx="0.5" />
              <rect x="11" y="9"  width="3" height="12" rx="0.5" />
              <rect x="16" y="5"  width="3" height="16" rx="0.5" />
            </svg>
            <p className="text-[12px] italic tracking-wide text-[#303030]/30 print:text-[13px]">
              [ Figure / Diagram ]
            </p>
          </div>
        </div>
      )}

      {/* Answer lines — short, long, numerical get writing lines; diagram gets 2 lines below the frame */}
      {(q.type === "short" ||
        q.type === "long" ||
        q.type === "numerical" ||
        q.type === "diagram") && (
        <div className="mt-2 space-y-2 pl-6">
          {Array.from({
            length:
              q.type === "long" || q.type === "numerical"
                ? 5
                : q.type === "diagram"
                  ? 2
                  : 2,
          }).map((_, i) => (
            <div
              key={i}
              className="h-px w-full border-b border-dashed border-[#303030]/20"
            />
          ))}
        </div>
      )}
    </li>
  );
}

function AnswerKey({ paper }: { paper: GeneratedPaper }) {
  // Flatten all answered questions across all sections, preserving original
  // numbering so teachers can match items 1-to-1.
  const items: { number: number; answer: string }[] = [];
  for (const section of paper.sections) {
    for (const q of section.questions) {
      if (q.answer) items.push({ number: q.number, answer: q.answer });
    }
  }
  if (!items.length) return null;

  return (
    <section className="print-section">
      <p className="text-[18px] font-bold leading-[2.4] tracking-[-0.03em] text-[#303030] sm:text-[20px]">
        Answer Key:
      </p>
      <ol className="list-decimal space-y-1 pl-6 text-[14px] leading-[2.4] tracking-[-0.03em] text-[#303030] sm:text-[16px]">
        {items.map(({ number, answer }) => (
          <li key={number} value={number}>
            {answer}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ─────────── utils ─────────── */

const SECTION_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
];
function sectionLabel(i: number): string {
  return SECTION_LETTERS[i] ?? String(i + 1);
}

function difficultyLabel(d: Difficulty): string {
  if (d === "easy") return "Easy";
  if (d === "moderate") return "Moderate";
  return "Challenging";
}

