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
  /* Ids of every Group this assignment has been assigned to. Empty by default. */
  groupIds?: string[];
  status: AssignmentStatus;
  progress: number;
  stage?: string;
  jobId?: string;
  error?: string;
  result?: GeneratedPaper;
  createdAt: string;
  updatedAt: string;
}

export type GroupColor =
  | "orange"
  | "blue"
  | "green"
  | "purple"
  | "pink"
  | "yellow";

export interface Group {
  id: string;
  name: string;
  classGrade?: string;
  section?: string;
  subject?: string;
  studentCount?: number;
  color: GroupColor;
  description?: string;
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupWithAssignments extends Group {
  assignments: Assignment[];
}

export interface CreateGroupInput {
  name: string;
  classGrade?: string;
  section?: string;
  subject?: string;
  studentCount?: number;
  color: GroupColor;
  description?: string;
}

export const GROUP_COLOR_LABELS: Record<GroupColor, string> = {
  orange: "Sunset",
  blue: "Ocean",
  green: "Forest",
  purple: "Plum",
  pink: "Rose",
  yellow: "Sand",
};

/* Hex pairs chosen to harmonise with the existing brand palette
   ([orange, dark grey, etc.]). Background tints are the swatch shown on
   the group card; foreground is used for chips/labels. */
export const GROUP_COLOR_TOKENS: Record<
  GroupColor,
  { bg: string; bgSoft: string; fg: string; ring: string }
> = {
  orange: { bg: "#ff5623", bgSoft: "#fff0ea", fg: "#c2410c", ring: "#ffd6c5" },
  blue:   { bg: "#2563eb", bgSoft: "#eaf1ff", fg: "#1e40af", ring: "#c7d8ff" },
  green:  { bg: "#16a34a", bgSoft: "#e7f7ed", fg: "#166534", ring: "#bde7c9" },
  purple: { bg: "#7c3aed", bgSoft: "#f1ebff", fg: "#5b21b6", ring: "#d8c8ff" },
  pink:   { bg: "#db2777", bgSoft: "#fde7f1", fg: "#9d174d", ring: "#f8c2da" },
  yellow: { bg: "#ca8a04", bgSoft: "#fef6dc", fg: "#854d0e", ring: "#f3deaa" },
};

/* ─────────── Library (Question Bank feature) ─────────── */

export interface LibraryQuestion {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
  answer?: string;
  subject?: string;
  topic?: string;
  sourceAssignmentId?: string;
  sourceTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLibraryQuestionInput {
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
  answer?: string;
  subject?: string;
  topic?: string;
  sourceAssignmentId?: string;
  sourceTitle?: string;
}

export interface LibraryFacet {
  value: string;
  count: number;
}

export interface LibraryFacets {
  subjects: LibraryFacet[];
  types: LibraryFacet[];
  difficulties: LibraryFacet[];
  total: number;
}

export interface LibraryListResponse {
  items: LibraryQuestion[];
  total: number;
  facets: LibraryFacets;
}

export interface LibraryQuery {
  q?: string;
  subject?: string;
  type?: QuestionType;
  difficulty?: Difficulty;
}

export interface BulkSaveLibraryResponse {
  inserted: LibraryQuestion[];
  insertedCount: number;
  skipped: number;
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
