import OpenAI from "openai";
import { env, isOpenAIEnabled } from "../config/env";
import { buildGenerationPrompt } from "./promptBuilder";
import { mockGenerate } from "./mockGenerator";
import type { CreateAssignmentInput, GeneratedPaper } from "../types";
import { GeneratedPaperSchema } from "../types";
import { redis } from "../config/redis";
import { createHash } from "crypto";

const openai = isOpenAIEnabled
  ? new OpenAI({
      apiKey: env.openaiApiKey,
      ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
    })
  : null;

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h

function hashPrompt(prompt: { system: string; user: string }): string {
  return createHash("sha256")
    .update(prompt.system)
    .update("\u0000")
    .update(prompt.user)
    .digest("hex")
    .slice(0, 24);
}

export interface GenerateOptions {
  bypassCache?: boolean;
}

/**
 * Generate a structured question paper.
 * - Uses Redis to cache identical prompts for 24h.
 * - Falls back to a deterministic mock generator when no OpenAI key is set,
 *   so the system is fully runnable without external dependencies.
 */
export async function generatePaper(
  input: CreateAssignmentInput & { extractedText?: string },
  opts: GenerateOptions = {}
): Promise<GeneratedPaper> {
  const prompt = buildGenerationPrompt(input);
  const cacheKey = `vedaai:gen:${hashPrompt(prompt)}`;

  if (!opts.bypassCache) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = GeneratedPaperSchema.safeParse(JSON.parse(cached));
        if (parsed.success) return parsed.data;
      }
    } catch {
      /* ignore cache errors */
    }
  }

  const paper = openai
    ? await callOpenAI(openai, prompt, input)
    : mockGenerate(input);

  try {
    await redis.set(cacheKey, JSON.stringify(paper), "EX", CACHE_TTL_SECONDS);
  } catch {
    /* ignore */
  }

  return paper;
}

async function callOpenAI(
  client: OpenAI,
  prompt: { system: string; user: string },
  input: CreateAssignmentInput
): Promise<GeneratedPaper> {
  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content ?? "";

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (e) {
    throw new Error(
      `LLM returned invalid JSON. First 200 chars: ${content.slice(0, 200)}`
    );
  }

  const parsed = GeneratedPaperSchema.safeParse(json);
  if (!parsed.success) {
    // Attempt one repair pass — strip stray fields, coerce numeric marks.
    const repaired = repairPaper(json, input);
    const reparsed = GeneratedPaperSchema.safeParse(repaired);
    if (!reparsed.success) {
      throw new Error(
        `LLM output failed schema validation: ${reparsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`
      );
    }
    return reparsed.data;
  }
  return parsed.data;
}

function repairPaper(raw: unknown, input: CreateAssignmentInput): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const totalMarks = input.questionTypes.reduce(
    (s, q) => s + q.count * q.marks,
    0
  );
  const meta =
    typeof obj.meta === "object" && obj.meta !== null
      ? (obj.meta as Record<string, unknown>)
      : {};
  meta.totalMarks = Number(meta.totalMarks ?? totalMarks);
  meta.title = String(meta.title ?? input.title);
  meta.subject = String(meta.subject ?? input.subject);
  meta.generalInstructions = Array.isArray(meta.generalInstructions)
    ? meta.generalInstructions
    : [];
  obj.meta = meta;
  return obj;
}
