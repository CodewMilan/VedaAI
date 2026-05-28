import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "mcq",
  "short",
  "long",
  "true_false",
  "fill_blank",
  "diagram",
  "numerical",
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const DifficultySchema = z.enum(["easy", "moderate", "hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const QuestionTypeConfigSchema = z.object({
  type: QuestionTypeSchema,
  count: z.number().int().min(1).max(50),
  marks: z.number().min(0.5).max(50),
});

export const DifficultyMixSchema = z
  .object({
    easy: z.number().int().min(0).max(100),
    moderate: z.number().int().min(0).max(100),
    hard: z.number().int().min(0).max(100),
  })
  .refine((v) => v.easy + v.moderate + v.hard === 100, {
    message: "Difficulty mix must sum to 100",
  });

export const CreateAssignmentSchema = z.object({
  title: z.string().min(2).max(200),
  subject: z.string().min(1).max(100),
  classGrade: z.string().max(50).optional().or(z.literal("")),
  dueDate: z.coerce.date().refine((d) => d.getTime() > Date.now() - 86400000, {
    message: "Due date must be today or in the future",
  }),
  duration: z.string().max(50).optional().or(z.literal("")),
  questionTypes: z.array(QuestionTypeConfigSchema).min(1),
  difficultyMix: DifficultyMixSchema,
  additionalInstructions: z.string().max(2000).optional().or(z.literal("")),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

export const GeneratedQuestionSchema = z.object({
  number: z.number().int(),
  text: z.string().min(1),
  type: QuestionTypeSchema,
  difficulty: DifficultySchema,
  marks: z.number(),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
});

export const GeneratedSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  instruction: z.string(),
  questions: z.array(GeneratedQuestionSchema).min(1),
});

export const GeneratedPaperSchema = z.object({
  meta: z.object({
    title: z.string(),
    subject: z.string(),
    classGrade: z.string().optional(),
    duration: z.string().optional(),
    totalMarks: z.number(),
    generalInstructions: z.array(z.string()).default([]),
  }),
  sections: z.array(GeneratedSectionSchema).min(1),
});

export type GeneratedPaper = z.infer<typeof GeneratedPaperSchema>;

export type AssignmentStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface SocketAssignmentEvent {
  assignmentId: string;
  status: AssignmentStatus;
  progress?: number;
  stage?: string;
  message?: string;
  result?: GeneratedPaper;
  error?: string;
}
