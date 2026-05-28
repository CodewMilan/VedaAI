export type QuestionType =
  | "mcq"
  | "short"
  | "long"
  | "true_false"
  | "fill_blank"
  | "diagram"
  | "numerical";

export type Difficulty = "easy" | "moderate" | "hard";

export type AssignmentStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface QuestionTypeConfig {
  type: QuestionType;
  count: number;
  marks: number;
}

export interface DifficultyMix {
  easy: number;
  moderate: number;
  hard: number;
}

export interface Question {
  number: number;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
  answer?: string;
}

export interface PaperSection {
  id: string;
  title: string;
  instruction: string;
  questions: Question[];
}

export interface GeneratedPaper {
  meta: {
    title: string;
    subject: string;
    classGrade?: string;
    duration?: string;
    totalMarks: number;
    generalInstructions: string[];
  };
  sections: PaperSection[];
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  classGrade?: string;
  dueDate: string;
  duration?: string;
  questionTypes: QuestionTypeConfig[];
  difficultyMix: DifficultyMix;
  additionalInstructions?: string;
  uploadedMaterial?: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    hasExtractedText: boolean;
  };
  status: AssignmentStatus;
  progress: number;
  stage?: string;
  jobId?: string;
  error?: string;
  result?: GeneratedPaper;
  createdAt: string;
  updatedAt: string;
}

export interface SocketAssignmentEvent {
  assignmentId: string;
  status: AssignmentStatus;
  progress?: number;
  stage?: string;
  message?: string;
  result?: GeneratedPaper;
  error?: string;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice Questions",
  short: "Short Questions",
  long: "Long Answer Questions",
  true_false: "True / False",
  fill_blank: "Fill in the Blanks",
  diagram: "Diagram/Graph-Based Questions",
  numerical: "Numerical Problems",
};

export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  mcq: "4-option choice questions",
  short: "1-2 sentence answers",
  long: "Detailed paragraph answers",
  true_false: "Boolean statement checks",
  fill_blank: "Single-word completions",
  diagram: "Interpret diagrams, charts, or graphs",
  numerical: "Step-by-step numerical calculations",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
};
