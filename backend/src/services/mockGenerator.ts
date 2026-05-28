import type {
  CreateAssignmentInput,
  Difficulty,
  GeneratedPaper,
  QuestionType,
} from "../types";

/**
 * Deterministic fallback generator. Used when OPENAI_API_KEY is not set.
 * Produces a realistic-looking paper that matches the requested structure
 * so the full system can be demoed end-to-end without external services.
 */
export function mockGenerate(
  input: CreateAssignmentInput & { extractedText?: string }
): GeneratedPaper {
  const totalMarks = input.questionTypes.reduce(
    (s, q) => s + q.count * q.marks,
    0
  );

  const sectionTitles: Record<QuestionType, string> = {
    mcq: "Multiple Choice Questions",
    short: "Short Answer Questions",
    long: "Long Answer Questions",
    true_false: "True or False",
    fill_blank: "Fill in the Blanks",
    diagram: "Diagram/Graph-Based Questions",
    numerical: "Numerical Problems",
  };

  const sectionInstructions: Record<QuestionType, string> = {
    mcq: "Choose the correct option. Each question carries equal marks.",
    short: "Answer briefly in 2-3 sentences. Attempt all questions.",
    long: "Answer in detail. Show your reasoning where applicable.",
    true_false: "State whether each statement is true or false.",
    fill_blank: "Fill in the blank with the correct word or phrase.",
    diagram:
      "Refer to the diagram or graph and answer the questions that follow.",
    numerical: "Show all calculations clearly. Round answers to 2 decimal places where needed.",
  };

  const subject = input.subject.toLowerCase();
  const topics = topicsFor(subject, input.extractedText);

  let questionNumber = 1;
  const sections = input.questionTypes.map((qt, sectionIndex) => {
    const sectionId = String.fromCharCode(65 + sectionIndex); // A, B, C...
    const questions = Array.from({ length: qt.count }).map((_, i) => {
      const difficulty = pickDifficulty(input.difficultyMix, i, qt.count);
      const topic = topics[(questionNumber + i) % topics.length];
      const text = makeQuestionText(qt.type, topic, difficulty);
      return {
        number: questionNumber++,
        text,
        type: qt.type,
        difficulty,
        marks: qt.marks,
        ...(qt.type === "mcq"
          ? { options: makeOptions(topic), answer: "A" }
          : qt.type === "true_false"
            ? { answer: i % 2 === 0 ? "True" : "False" }
            : {}),
      };
    });
    return {
      id: sectionId,
      title: `Section ${sectionId} — ${sectionTitles[qt.type]}`,
      instruction: `${sectionInstructions[qt.type]} Each question carries ${qt.marks} mark${qt.marks === 1 ? "" : "s"}.`,
      questions,
    };
  });

  const generalInstructions = [
    "All questions are compulsory.",
    "Read each question carefully before answering.",
    "Marks are indicated against each question.",
  ];
  if (input.additionalInstructions?.trim()) {
    generalInstructions.push(input.additionalInstructions.trim());
  }

  return {
    meta: {
      title: input.title,
      subject: input.subject,
      classGrade: input.classGrade || undefined,
      duration: input.duration || undefined,
      totalMarks,
      generalInstructions,
    },
    sections,
  };
}

function pickDifficulty(
  mix: { easy: number; moderate: number; hard: number },
  index: number,
  total: number
): Difficulty {
  const ratio = (index + 0.5) / total;
  const easyFrac = mix.easy / 100;
  const modFrac = (mix.easy + mix.moderate) / 100;
  if (ratio < easyFrac) return "easy";
  if (ratio < modFrac) return "moderate";
  return "hard";
}

function topicsFor(subject: string, material?: string): string[] {
  if (material && material.length > 200) {
    // Pull simple noun-ish keywords out of the material.
    const words = material
      .replace(/[^a-zA-Z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 5 && /^[A-Z][a-z]+/.test(w));
    const unique = Array.from(new Set(words)).slice(0, 12);
    if (unique.length >= 4) return unique;
  }

  if (/math|algebra|geometry|calculus/.test(subject))
    return [
      "linear equations",
      "quadratic functions",
      "Pythagoras' theorem",
      "trigonometric identities",
      "differentiation",
      "integration",
      "probability",
      "matrices",
    ];
  if (/phys/.test(subject))
    return [
      "Newton's laws of motion",
      "kinematics",
      "work and energy",
      "electric circuits",
      "wave optics",
      "thermodynamics",
      "rotational motion",
    ];
  if (/chem/.test(subject))
    return [
      "the periodic table",
      "chemical bonding",
      "redox reactions",
      "organic functional groups",
      "stoichiometry",
      "acids and bases",
    ];
  if (/bio/.test(subject))
    return [
      "cell structure",
      "photosynthesis",
      "human respiratory system",
      "Mendelian genetics",
      "evolution",
      "ecosystems",
    ];
  if (/hist/.test(subject))
    return [
      "the French Revolution",
      "World War II",
      "ancient civilisations",
      "the Industrial Revolution",
      "decolonisation",
    ];
  if (/comp|cs|programming/.test(subject))
    return [
      "data structures",
      "algorithms",
      "object-oriented programming",
      "database normalisation",
      "operating systems",
      "networking protocols",
    ];
  if (/eng|literature/.test(subject))
    return [
      "figures of speech",
      "narrative point of view",
      "Shakespearean tragedy",
      "modernist poetry",
      "essay structure",
    ];
  return [
    "key concepts",
    "core principles",
    "applied examples",
    "historical context",
    "contemporary applications",
  ];
}

function makeQuestionText(
  type: QuestionType,
  topic: string,
  difficulty: Difficulty
): string {
  const depth =
    difficulty === "easy"
      ? "Define"
      : difficulty === "moderate"
        ? "Explain"
        : "Critically analyse";
  switch (type) {
    case "mcq":
      return `Which of the following best describes ${topic}?`;
    case "short":
      return `${depth} ${topic} in your own words.`;
    case "long":
      return `${depth} ${topic} with relevant examples and supporting evidence. (${difficulty} level)`;
    case "true_false":
      return `${capitalise(topic)} plays a central role in this subject.`;
    case "fill_blank":
      return `The concept most closely associated with ${topic} is ____________.`;
    case "diagram":
      return `Study the diagram representing ${topic} and identify the labelled components. ${depth} the relationships shown.`;
    case "numerical":
      return `A standard problem involving ${topic}: calculate the required value, showing all steps. (${difficulty} level)`;
  }
}

function makeOptions(topic: string): string[] {
  return [
    `A foundational principle related to ${topic}`,
    `An unrelated concept from a different field`,
    `A common misconception about ${topic}`,
    `A modern extension of ${topic}`,
  ];
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
