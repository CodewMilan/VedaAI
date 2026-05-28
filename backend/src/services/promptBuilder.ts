import type { CreateAssignmentInput } from "../types";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple Choice (with 4 options labelled A-D)",
  short: "Short Answer (1-2 sentences)",
  long: "Long Answer (a detailed paragraph or solution)",
  true_false: "True/False",
  fill_blank: "Fill in the Blank",
  diagram:
    "Diagram/Graph-Based (describe a diagram or chart, then ask interpretation questions)",
  numerical:
    "Numerical Problem (a quantitative problem that requires step-by-step calculation)",
};

export function buildGenerationPrompt(
  input: CreateAssignmentInput & { extractedText?: string }
): { system: string; user: string } {
  const totalMarks = input.questionTypes.reduce(
    (sum, q) => sum + q.count * q.marks,
    0
  );

  const totalQuestions = input.questionTypes.reduce((s, q) => s + q.count, 0);

  const typeBreakdown = input.questionTypes
    .map(
      (q) =>
        `- ${q.count} × ${QUESTION_TYPE_LABELS[q.type] ?? q.type} @ ${q.marks} marks each`
    )
    .join("\n");

  const system = `You are an expert teacher and assessment designer. Your job is to generate a high-quality question paper that strictly follows the requested structure. You MUST respond with valid JSON only — no prose, no markdown fences, no explanation.

The JSON must match this TypeScript type exactly:
{
  "meta": {
    "title": string,
    "subject": string,
    "classGrade"?: string,
    "duration"?: string,
    "totalMarks": number,
    "generalInstructions": string[]
  },
  "sections": Array<{
    "id": string,           // "A", "B", "C", ...
    "title": string,        // e.g. "Section A - Multiple Choice"
    "instruction": string,  // e.g. "Attempt all questions. Each question carries 1 mark."
    "questions": Array<{
      "number": number,     // continuous numbering across the whole paper
      "text": string,
      "type": "mcq" | "short" | "long" | "true_false" | "fill_blank" | "diagram" | "numerical",
      "difficulty": "easy" | "moderate" | "hard",
      "marks": number,
      "options"?: string[], // required for mcq, length 4
      "answer"?: string     // optional answer key for the teacher
    }>
  }>
}

Rules:
- Group questions by type into clearly labelled sections (Section A, B, C ...).
- Number questions continuously across sections (1, 2, 3, ...).
- Question text must be self-contained, accurate, and unambiguous.
- For MCQs, always provide exactly 4 distinct, plausible options.
- Distribute difficulty according to the requested mix as closely as possible.
- Do not invent facts not supported by the source material when material is provided.`;

  const materialSection = input.extractedText
    ? `\n\nSource material (use this as the primary basis for questions; do not contradict it):\n"""\n${input.extractedText.slice(0, 8000)}\n"""\n`
    : "";

  const user = `Generate a question paper with these specifications:

Title: ${input.title}
Subject: ${input.subject}${input.classGrade ? `\nClass / Grade: ${input.classGrade}` : ""}${input.duration ? `\nDuration: ${input.duration}` : ""}

Question breakdown (${totalQuestions} questions, ${totalMarks} total marks):
${typeBreakdown}

Difficulty mix (target percentages of total questions):
- Easy: ${input.difficultyMix.easy}%
- Moderate: ${input.difficultyMix.moderate}%
- Hard: ${input.difficultyMix.hard}%

${input.additionalInstructions ? `Additional instructions from the teacher:\n${input.additionalInstructions}\n` : ""}${materialSection}

Return ONLY the JSON object. Total marks must equal ${totalMarks}.`;

  return { system, user };
}
