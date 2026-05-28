"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Mic,
  Minus,
  Plus,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { DifficultyMixSlider } from "@/components/ui/difficulty-mix";
import { createAssignment } from "@/lib/api";
import {
  QUESTION_TYPE_LABELS,
  type QuestionType,
} from "@/lib/types";
import { useAssignmentsStore } from "@/store/assignments";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────
   Schema
   ───────────────────────────────────────────────────────────────── */

const QUESTION_TYPES: QuestionType[] = [
  "mcq",
  "short",
  "long",
  "true_false",
  "fill_blank",
  "diagram",
  "numerical",
];

const FormSchema = z.object({
  title: z.string().min(2, "Give it a title (≥ 2 chars)").max(200),
  subject: z.string().min(1, "Pick a subject").max(100),
  classGrade: z.string().max(50).optional(),
  dueDate: z
    .string()
    .min(1, "Pick a due date")
    .refine(
      (v) => new Date(v).getTime() >= new Date().setHours(0, 0, 0, 0),
      { message: "Due date can't be in the past" }
    ),
  duration: z.string().max(50).optional(),
  questionTypes: z
    .array(
      z.object({
        type: z.enum([
          "mcq",
          "short",
          "long",
          "true_false",
          "fill_blank",
          "diagram",
          "numerical",
        ]),
        count: z.number().int().min(1).max(50),
        marks: z.number().min(0.5).max(50),
      })
    )
    .min(1, "Pick at least one question type"),
  difficultyMix: z
    .object({
      easy: z.number().int().min(0).max(100),
      moderate: z.number().int().min(0).max(100),
      hard: z.number().int().min(0).max(100),
    })
    .refine((v) => v.easy + v.moderate + v.hard === 100, {
      message: "Difficulty mix must sum to 100",
    }),
  additionalInstructions: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

const DEFAULT_MARKS: Record<QuestionType, number> = {
  mcq: 1,
  short: 2,
  long: 5,
  true_false: 1,
  fill_blank: 1,
  diagram: 5,
  numerical: 5,
};

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/* ─────────────────────────────────────────────────────────────────
   Top-level form (2-step wizard)
   Step 1: Figma node 2:9436 (Upload + Due Date + Question Types + Notes)
   Step 2: Title + Subject + Class + Duration + Difficulty mix
   ───────────────────────────────────────────────────────────────── */

export function CreateAssignmentForm() {
  const router = useRouter();
  const upsert = useAssignmentsStore((s) => s.upsert);

  const [step, setStep] = React.useState<1 | 2>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      subject: "",
      classGrade: "",
      dueDate: todayPlus(7),
      duration: "",
      /* Figma 2:9436 default rows: 4 MCQ, 3 Short, 5 Diagram, 5 Numerical */
      questionTypes: [
        { type: "mcq", count: 4, marks: 1 },
        { type: "short", count: 3, marks: 2 },
        { type: "diagram", count: 5, marks: 5 },
        { type: "numerical", count: 5, marks: 5 },
      ],
      difficultyMix: { easy: 40, moderate: 40, hard: 20 },
      additionalInstructions: "",
    },
  });

  const questionTypes = watch("questionTypes");
  const totalQuestions = questionTypes.reduce(
    (s, q) => s + (q.count || 0),
    0
  );
  const totalMarks = questionTypes.reduce(
    (s, q) => s + (q.count || 0) * (q.marks || 0),
    0
  );

  const addType = (type: QuestionType) => {
    if (questionTypes.some((q) => q.type === type)) return;
    setValue(
      "questionTypes",
      [...questionTypes, { type, count: 5, marks: DEFAULT_MARKS[type] }],
      { shouldValidate: true }
    );
  };

  const removeType = (type: QuestionType) => {
    const next = questionTypes.filter((q) => q.type !== type);
    if (next.length === 0) return;
    setValue("questionTypes", next, { shouldValidate: true });
  };

  /** Validate just the step-1 fields before letting the user advance. */
  const onNext = async () => {
    const ok = await trigger(["dueDate", "questionTypes"]);
    if (!ok) {
      toast.error("Fix the highlighted fields first");
      return;
    }
    setStep(2);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onPrevious = () => {
    if (step === 1) {
      router.push("/assignments");
      return;
    }
    setStep(1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", values.title);
      fd.append("subject", values.subject);
      fd.append("classGrade", values.classGrade ?? "");
      fd.append("dueDate", new Date(values.dueDate).toISOString());
      fd.append("duration", values.duration ?? "");
      fd.append("questionTypes", JSON.stringify(values.questionTypes));
      fd.append("difficultyMix", JSON.stringify(values.difficultyMix));
      fd.append(
        "additionalInstructions",
        values.additionalInstructions ?? ""
      );
      if (file) fd.append("material", file);

      const created = await createAssignment(fd);
      upsert(created);
      toast.success("Assignment queued — generating now");
      router.push(`/assignments/${created.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-[810px] flex-col items-center gap-8 pb-16"
      data-figma-node="2:9436"
    >
      {/* ── Page header (Figma 2:9439) ── */}
      <header className="flex w-full items-center gap-3 self-start p-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full bg-emerald-500"
          aria-hidden
        />
        <div className="flex flex-col gap-0.5">
          <h1
            className="text-[20px] font-bold leading-[1.4] tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Create Assignment
          </h1>
          <p
            className="text-[14px] leading-[1.4] tracking-[-0.04em] text-[rgba(94,94,94,0.55)]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            {step === 1
              ? "Set up a new assignment for your students"
              : "A few more details so the AI builds the right paper"}
          </p>
        </div>
      </header>

      {/* ── Progress bar (Figma 2:9445) ── */}
      <div
        className="flex w-full max-w-[815px] items-center gap-3"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={2}
      >
        <ProgressSegment active />
        <ProgressSegment active={step >= 2} />
      </div>

      {/* ── Card — step-aware body ── */}
      {step === 1 ? (
        <Step1
          file={file}
          setFile={setFile}
          register={register}
          control={control}
          errors={errors}
          questionTypes={questionTypes}
          addType={addType}
          removeType={removeType}
          totalQuestions={totalQuestions}
          totalMarks={totalMarks}
          setValue={setValue}
        />
      ) : (
        <Step2 register={register} control={control} errors={errors} />
      )}

      {/* ── Footer pills (Figma 2:9549), OUTSIDE the card ── */}
      <div className="flex w-full items-center justify-between px-0">
        <button
          type="button"
          onClick={onPrevious}
          className={cn(
            "inline-flex items-center gap-1 rounded-[48px] bg-white px-6 py-3 text-[16px] font-medium tracking-[-0.04em] text-[#303030]",
            "transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
          )}
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
          Previous
        </button>

        {step === 1 ? (
          <button
            type="button"
            onClick={onNext}
            className={cn(
              "inline-flex items-center gap-1 rounded-[48px] border-[1.5px] border-[rgba(255,255,255,0.5)] bg-[#181818] px-6 py-3 text-[16px] font-medium tracking-[-0.04em] text-white",
              "transition-transform duration-150 hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
            )}
          >
            Next
            <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[48px] border-[1.5px] border-[rgba(255,255,255,0.5)] bg-[#181818] px-6 py-3 text-[16px] font-medium tracking-[-0.04em] text-white",
              "transition-transform duration-150 hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" strokeWidth={2.2} />
                Generate Paper
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Step 1 — Figma node 2:9451
   ───────────────────────────────────────────────────────────────── */

interface Step1Props {
  file: File | null;
  setFile: (f: File | null) => void;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  control: ReturnType<typeof useForm<FormValues>>["control"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  questionTypes: FormValues["questionTypes"];
  addType: (t: QuestionType) => void;
  removeType: (t: QuestionType) => void;
  totalQuestions: number;
  totalMarks: number;
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
}

function Step1({
  file,
  setFile,
  register,
  control,
  errors,
  questionTypes,
  addType,
  removeType,
  totalQuestions,
  totalMarks,
  setValue,
}: Step1Props) {
  return (
    <div
      className="flex w-full flex-col gap-8 rounded-[32px] bg-white/50 p-6 backdrop-blur-sm sm:p-8"
      data-figma-node="2:9451"
    >
      {/* Card header */}
      <header className="flex flex-col gap-0.5">
        <h2
          className="text-[20px] font-bold leading-[1.4] tracking-[-0.04em] text-[#303030]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          Assignment Details
        </h2>
        <p
          className="text-[14px] leading-[1.4] tracking-[-0.04em] text-[rgba(94,94,94,0.8)]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          Basic information about your assignment
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {/* ── Upload zone ── */}
        <div className="flex flex-col gap-3">
          <UploadZone file={file} onFileChange={setFile} />
          <p
            className="text-center text-[14px] font-medium tracking-[-0.04em] text-[rgba(48,48,48,0.6)] sm:text-[16px]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Upload images of your preferred document/image
          </p>
        </div>

        {/* ── Due Date ── */}
        <DueDateField register={register} error={errors.dueDate?.message} />

        {/* ── Question types ── */}
        <QuestionTypesSection
          control={control}
          questionTypes={questionTypes}
          addType={addType}
          removeType={removeType}
          totalQuestions={totalQuestions}
          totalMarks={totalMarks}
          setValue={setValue}
        />

        {/* ── Additional information ── */}
        <AdditionalInfoField register={register} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Step 2 — title/subject/class/duration/difficulty
   ───────────────────────────────────────────────────────────────── */

function Step2({
  register,
  control,
  errors,
}: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  control: ReturnType<typeof useForm<FormValues>>["control"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
}) {
  return (
    <div className="flex w-full flex-col gap-8 rounded-[32px] bg-white/50 p-6 backdrop-blur-sm sm:p-8">
      <header className="flex flex-col gap-0.5">
        <h2
          className="text-[20px] font-bold leading-[1.4] tracking-[-0.04em] text-[#303030]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          About this paper
        </h2>
        <p
          className="text-[14px] leading-[1.4] tracking-[-0.04em] text-[rgba(94,94,94,0.8)]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          Tell us about the topic, audience, and difficulty mix
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <PillField
          label="Title"
          required
          error={errors.title?.message}
          placeholder="e.g. Mid-term: Cellular Biology"
          {...register("title")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PillField
            label="Subject"
            required
            error={errors.subject?.message}
            placeholder="e.g. Biology"
            list="vedaai-subjects"
            {...register("subject")}
          />
          <datalist id="vedaai-subjects">
            <option value="Mathematics" />
            <option value="Physics" />
            <option value="Chemistry" />
            <option value="Biology" />
            <option value="History" />
            <option value="English Literature" />
            <option value="Computer Science" />
            <option value="Geography" />
            <option value="Economics" />
          </datalist>

          <PillField
            label="Class / Grade"
            hint="optional"
            error={errors.classGrade?.message}
            placeholder="e.g. Grade 10 — Section A"
            {...register("classGrade")}
          />
        </div>

        <PillField
          label="Duration"
          hint="optional"
          error={errors.duration?.message}
          placeholder="e.g. 45 minutes"
          {...register("duration")}
        />

        <div className="flex flex-col gap-2">
          <label
            className="text-[16px] font-bold tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Difficulty mix
          </label>
          <div className="rounded-2xl bg-white/70 p-4">
            <Controller
              control={control}
              name="difficultyMix"
              render={({ field }) => (
                <DifficultyMixSlider
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          {errors.difficultyMix && (
            <p className="text-[12px] text-[#c53535]">
              {errors.difficultyMix.message ?? errors.difficultyMix.root?.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Atoms
   ───────────────────────────────────────────────────────────────── */

function ProgressSegment({ active = false }: { active?: boolean }) {
  return (
    <span
      className={cn(
        "h-[5px] flex-1 rounded-full transition-colors duration-200",
        active ? "bg-[#303030]" : "bg-[#dadada]"
      )}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
   Upload zone — Figma 2:9457
   ───────────────────────────────────────────────────────────────── */

function UploadZone({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const maxSizeMB = 10;

  const handleFile = (f: File | null | undefined) => {
    setError(null);
    if (!f) return onFileChange(null);
    if (f.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large — max ${maxSizeMB} MB`);
      return;
    }
    onFileChange(f);
  };

  if (file) {
    const sizeKB = Math.round(file.size / 1024);
    return (
      <div className="flex items-center gap-3 rounded-[24px] border-[1.75px] border-dashed border-[rgba(0,0,0,0.2)] bg-white p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0ea] text-[#ff5623]">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-[#303030] sm:text-[16px]">
            {file.name}
          </div>
          <div className="mt-0.5 text-[12px] text-[#a9a9a9] tabular-nums">
            {sizeKB < 1024
              ? `${sizeKB} KB`
              : `${(sizeKB / 1024).toFixed(1)} MB`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleFile(null)}
          aria-label={`Remove ${file.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#5e5e5e] transition-colors duration-150 hover:bg-[#f0f0f0] hover:text-[#303030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-[24px] border-[1.75px] border-dashed bg-white px-6 py-6 transition-colors duration-150 sm:px-8",
          dragOver
            ? "border-[#ff5623] bg-[#fff5f0]"
            : "border-[rgba(0,0,0,0.2)]"
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <UploadCloud className="h-6 w-6 text-[#303030]" strokeWidth={2} />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p
            className="text-[16px] font-medium leading-[1.4] tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Choose a file or drag &amp; drop it here
          </p>
          <p
            className="text-[14px] leading-[1.4] tracking-[-0.04em] text-[#a9a9a9]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            JPEG, PNG, PDF, upto {maxSizeMB}MB
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center rounded-[48px] bg-[#f6f6f6] px-6 py-2 text-[14px] font-medium tracking-[-0.04em] text-[#303030] transition-colors duration-150 hover:bg-[#ececec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
        >
          Browse Files
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,application/pdf,text/plain,image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && (
        <p role="alert" className="text-[12px] font-medium text-[#c53535]">
          {error}
        </p>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Due Date — Figma 2:9465
   ───────────────────────────────────────────────────────────────── */

function DueDateField({
  register,
  error,
}: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="due-date"
        className="text-[16px] font-bold tracking-[-0.04em] text-[#303030]"
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        Due Date
      </label>
      <div className="relative">
        <input
          id="due-date"
          type="date"
          min={todayPlus(0)}
          className={cn(
            "h-11 w-full rounded-full border-[1.25px] border-[#dadada] bg-transparent px-4 pr-12 text-[16px] font-medium tracking-[-0.04em] text-[#303030]",
            "outline-none transition-colors duration-150 focus:border-[#ff5623] focus:ring-2 focus:ring-[#ff5623]/15",
            "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          )}
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          {...register("dueDate")}
        />
        <CalendarPlus
          className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[#303030]"
          strokeWidth={1.8}
        />
      </div>
      {error && (
        <p role="alert" className="text-[12px] font-medium text-[#c53535]">
          {error}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Question types — Figma 2:9471
   ───────────────────────────────────────────────────────────────── */

function QuestionTypesSection({
  control,
  questionTypes,
  addType,
  removeType,
  totalQuestions,
  totalMarks,
  setValue,
}: {
  control: ReturnType<typeof useForm<FormValues>>["control"];
  questionTypes: FormValues["questionTypes"];
  addType: (t: QuestionType) => void;
  removeType: (t: QuestionType) => void;
  totalQuestions: number;
  totalMarks: number;
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
}) {
  const availableToAdd = QUESTION_TYPES.filter(
    (t) => !questionTypes.some((q) => q.type === t)
  );

  /** Helper to swap the type of an existing row (for the dropdown). */
  const changeType = (rowIndex: number, nextType: QuestionType) => {
    const next = [...questionTypes];
    next[rowIndex] = { ...next[rowIndex], type: nextType };
    setValue("questionTypes", next, { shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Desktop layout: 3 columns ── */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[1fr_100px_100px] gap-x-3 gap-y-4 items-start">
          {/* Column headers */}
          <label
            className="text-[16px] font-bold tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Question Type
          </label>
          <span
            className="text-center text-[16px] font-medium tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            No. of Questions
          </span>
          <span
            className="text-center text-[16px] font-medium tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Marks
          </span>

          {/* Rows */}
          {questionTypes.map((qt, idx) => {
            const usedElsewhere = (t: QuestionType) =>
              questionTypes.some((q, i) => i !== idx && q.type === t);
            return (
              <React.Fragment key={qt.type}>
                <div className="flex items-center gap-3">
                  <QuestionTypeDropdown
                    value={qt.type}
                    onChange={(next) => changeType(idx, next)}
                    isDisabledOption={usedElsewhere}
                  />
                  <button
                    type="button"
                    onClick={() => removeType(qt.type)}
                    disabled={questionTypes.length === 1}
                    aria-label={`Remove ${QUESTION_TYPE_LABELS[qt.type]}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5e5e5e] transition-colors duration-150 hover:bg-[#f0f0f0] hover:text-[#c53535] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#5e5e5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623]"
                  >
                    <X className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                </div>

                <div className="flex justify-center">
                  <Controller
                    control={control}
                    name={`questionTypes.${idx}.count`}
                    render={({ field }) => (
                      <FigmaStepper
                        value={field.value}
                        onChange={field.onChange}
                        min={1}
                        max={50}
                        ariaLabel={`${QUESTION_TYPE_LABELS[qt.type]} count`}
                      />
                    )}
                  />
                </div>

                <div className="flex justify-center">
                  <Controller
                    control={control}
                    name={`questionTypes.${idx}.marks`}
                    render={({ field }) => (
                      <FigmaStepper
                        value={field.value}
                        onChange={field.onChange}
                        min={1}
                        max={50}
                        ariaLabel={`${QUESTION_TYPE_LABELS[qt.type]} marks`}
                      />
                    )}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Mobile layout: stacked ── */}
      <div className="flex flex-col gap-4 md:hidden">
        <label
          className="text-[16px] font-bold tracking-[-0.04em] text-[#303030]"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          Question Type
        </label>
        {questionTypes.map((qt, idx) => {
          const usedElsewhere = (t: QuestionType) =>
            questionTypes.some((q, i) => i !== idx && q.type === t);
          return (
            <div
              key={qt.type}
              className="rounded-2xl bg-white/70 p-3 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <QuestionTypeDropdown
                  value={qt.type}
                  onChange={(next) => changeType(idx, next)}
                  isDisabledOption={usedElsewhere}
                />
                <button
                  type="button"
                  onClick={() => removeType(qt.type)}
                  disabled={questionTypes.length === 1}
                  aria-label={`Remove ${QUESTION_TYPE_LABELS[qt.type]}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5e5e5e] transition-colors duration-150 hover:bg-[#f0f0f0] hover:text-[#c53535] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#5e5e5e]"
                >
                  <X className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[12px] font-medium text-[#5e5e5e]">
                    No. of Questions
                  </span>
                  <Controller
                    control={control}
                    name={`questionTypes.${idx}.count`}
                    render={({ field }) => (
                      <FigmaStepper
                        value={field.value}
                        onChange={field.onChange}
                        min={1}
                        max={50}
                      />
                    )}
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[12px] font-medium text-[#5e5e5e]">
                    Marks
                  </span>
                  <Controller
                    control={control}
                    name={`questionTypes.${idx}.marks`}
                    render={({ field }) => (
                      <FigmaStepper
                        value={field.value}
                        onChange={field.onChange}
                        min={1}
                        max={50}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add Question Type chip + Totals row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {availableToAdd.length > 0 ? (
          <AddQuestionTypeButton
            available={availableToAdd}
            onPick={addType}
          />
        ) : (
          <span />
        )}

        <div
          className="flex flex-col items-start gap-2 sm:items-end"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          <span className="text-[16px] font-medium leading-[1.1] tracking-[-0.04em] text-[#303030] tabular-nums">
            Total Questions&nbsp;:&nbsp; {totalQuestions}
          </span>
          <span className="text-[16px] font-medium leading-[1.1] tracking-[-0.04em] text-[#303030] tabular-nums">
            Total Marks&nbsp;:&nbsp; {totalMarks}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Custom dropdown for picking the question type — pill shaped, white bg.
   Figma 2:9477. Renders all known types; ones already used in other rows
   are disabled so the user can't pick a duplicate. */
function QuestionTypeDropdown({
  value,
  onChange,
  isDisabledOption,
}: {
  value: QuestionType;
  onChange: (t: QuestionType) => void;
  isDisabledOption: (t: QuestionType) => boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative flex-1 min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-full bg-white px-4 text-left text-[16px] font-medium tracking-[-0.04em] text-[#303030]",
          "transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
        )}
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        <span className="truncate">{QUESTION_TYPE_LABELS[value]}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[#303030] transition-transform duration-150",
            open && "rotate-180"
          )}
          strokeWidth={2.2}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-12 z-40 w-full overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)]"
        >
          {QUESTION_TYPES.map((t) => {
            const disabled = isDisabledOption(t) && t !== value;
            const selected = t === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={selected}
                key={t}
                onClick={() => {
                  if (disabled) return;
                  onChange(t);
                  setOpen(false);
                }}
                disabled={disabled}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition-colors duration-100",
                  selected && "bg-[#fff0ea] text-[#ff5623]",
                  !selected && !disabled && "text-[#303030] hover:bg-[#f6f6f6]",
                  disabled && "cursor-not-allowed text-[#a9a9a9]"
                )}
              >
                <span className="truncate">{QUESTION_TYPE_LABELS[t]}</span>
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FigmaStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex h-11 w-[100px] items-center justify-between rounded-full bg-white px-2"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrement"
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#303030] transition-colors duration-100 hover:bg-[#f0f0f0] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623]"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
      <span
        className="text-[16px] font-medium tracking-[-0.04em] tabular-nums text-[#303030]"
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increment"
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#303030] transition-colors duration-100 hover:bg-[#f0f0f0] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
    </div>
  );
}

function AddQuestionTypeButton({
  available,
  onPick,
}: {
  available: QuestionType[];
  onPick: (t: QuestionType) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-[48px] py-1 pl-1 pr-3 text-[14px] font-bold tracking-[-0.04em] text-[#303030]",
          "transition-transform duration-150 hover:-translate-y-px",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
        )}
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b2b2b] text-white">
          <Plus className="h-4 w-4" strokeWidth={2.4} />
        </span>
        Add Question Type
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-12 z-40 w-[260px] overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)]"
        >
          {available.map((t) => (
            <button
              type="button"
              role="menuitem"
              key={t}
              onClick={() => {
                onPick(t);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] font-medium text-[#303030] transition-colors duration-100 hover:bg-[#f6f6f6]"
            >
              <Plus className="h-4 w-4 text-[#5e5e5e]" />
              {QUESTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Additional Information — Figma 2:9543
   ───────────────────────────────────────────────────────────────── */

function AdditionalInfoField({
  register,
}: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="additional-info"
        className="text-[16px] font-bold tracking-[-0.04em] text-[#303030]"
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        Additional Information (For better output)
      </label>
      <div className="relative">
        <textarea
          id="additional-info"
          placeholder="e.g Generate a question paper for 3 hour exam duration..."
          className={cn(
            "h-[102px] w-full resize-none rounded-2xl border-[1.25px] border-dashed border-[#dadada] bg-white/25 p-4 pr-14 text-[14px] font-medium leading-[1.4] tracking-[-0.04em] text-[#303030] placeholder:text-[rgba(48,48,48,0.6)]",
            "outline-none transition-colors duration-150 focus:border-[#ff5623] focus:bg-white/50"
          )}
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          {...register("additionalInstructions")}
        />
        <button
          type="button"
          disabled
          aria-label="Dictate (coming soon)"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f0f0] text-[#5e5e5e] disabled:opacity-60"
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Step-2 pill text field
   ───────────────────────────────────────────────────────────────── */

interface PillFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
}

const PillField = React.forwardRef<HTMLInputElement, PillFieldProps>(
  function PillField(
    { label, required, hint, error, className, id, ...rest },
    ref
  ) {
    const inputId = id ?? React.useId();
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor={inputId}
            className="text-[16px] font-bold tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            {label}
            {required && <span className="ml-0.5 text-[#c53535]">*</span>}
          </label>
          {hint && (
            <span className="text-[12px] font-medium text-[rgba(94,94,94,0.6)]">
              {hint}
            </span>
          )}
        </div>
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-11 w-full rounded-full border-[1.25px] border-[#dadada] bg-transparent px-4 text-[16px] font-medium tracking-[-0.04em] text-[#303030] placeholder:text-[#a9a9a9]",
            "outline-none transition-colors duration-150 focus:border-[#ff5623] focus:ring-2 focus:ring-[#ff5623]/15",
            error && "border-[#c53535] focus:border-[#c53535] focus:ring-[#c53535]/15",
            className
          )}
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          {...rest}
        />
        {error && (
          <p role="alert" className="text-[12px] font-medium text-[#c53535]">
            {error}
          </p>
        )}
      </div>
    );
  }
);
