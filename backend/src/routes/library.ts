import { Router } from "express";
import mongoose from "mongoose";
import { LibraryQuestion } from "../models/LibraryQuestion";
import {
  CreateLibraryQuestionSchema,
  UpdateLibraryQuestionSchema,
  BulkSaveLibrarySchema,
} from "../types";

export const libraryRouter = Router();

/* ─────────── List (with search + filters + facets) ───────────
   Query params (all optional):
     q          — free-text search across text/answer/topic
     subject    — exact subject match
     type       — question type filter
     difficulty — difficulty filter
   Response: { items: LibraryQuestion[], total, facets }
   `facets` powers the filter chips + stat counts in the UI. */
libraryRouter.get("/", async (req, res) => {
  const { q, subject, type, difficulty } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (subject) filter.subject = subject;
  if (type) filter.type = type;
  if (difficulty) filter.difficulty = difficulty;
  if (q && q.trim()) {
    /* Use a case-insensitive regex (works without the text index existing
       yet and supports partial matches, which $text does not). */
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ text: rx }, { answer: rx }, { topic: rx }];
  }

  const [docs, facets] = await Promise.all([
    LibraryQuestion.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
    computeFacets(),
  ]);

  res.json({
    items: docs.map(serialise),
    total: docs.length,
    facets,
  });
});

/* ─────────── Create one ─────────── */
libraryRouter.post("/", async (req, res) => {
  const parsed = CreateLibraryQuestionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", issues: parsed.error.issues });
  }
  const doc = await LibraryQuestion.create(clean(parsed.data));
  res.status(201).json(serialise(doc.toObject()));
});

/* ─────────── Bulk save (from a paper) ───────────
   De-dupes against existing rows that share the exact same text so saving
   the same paper twice doesn't create duplicates. Returns the rows that
   were actually inserted plus how many were skipped. */
libraryRouter.post("/bulk", async (req, res) => {
  const parsed = BulkSaveLibrarySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const incoming = parsed.data.questions.map(clean);
  const texts = incoming.map((q) => q.text);
  const existing = await LibraryQuestion.find({ text: { $in: texts } })
    .select("text")
    .lean();
  const existingTexts = new Set(existing.map((e) => e.text));

  const toInsert = incoming.filter((q) => !existingTexts.has(q.text));
  const inserted = toInsert.length
    ? await LibraryQuestion.insertMany(toInsert)
    : [];

  res.status(201).json({
    inserted: inserted.map((d) => serialise(d.toObject())),
    insertedCount: inserted.length,
    skipped: incoming.length - toInsert.length,
  });
});

/* ─────────── Update ─────────── */
libraryRouter.put("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const parsed = UpdateLibraryQuestionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", issues: parsed.error.issues });
  }
  const doc = await LibraryQuestion.findByIdAndUpdate(
    req.params.id,
    clean(parsed.data),
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: "Question not found" });
  res.json(serialise(doc));
});

/* ─────────── Delete ─────────── */
libraryRouter.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  await LibraryQuestion.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ─────────── helpers ─────────── */

async function computeFacets() {
  const [bySubject, byType, byDifficulty, total] = await Promise.all([
    LibraryQuestion.aggregate<{ _id: string | null; n: number }>([
      { $group: { _id: "$subject", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    LibraryQuestion.aggregate<{ _id: string; n: number }>([
      { $group: { _id: "$type", n: { $sum: 1 } } },
    ]),
    LibraryQuestion.aggregate<{ _id: string; n: number }>([
      { $group: { _id: "$difficulty", n: { $sum: 1 } } },
    ]),
    LibraryQuestion.countDocuments(),
  ]);

  return {
    subjects: bySubject
      .filter((r) => r._id)
      .map((r) => ({ value: r._id as string, count: r.n })),
    types: byType.map((r) => ({ value: r._id, count: r.n })),
    difficulties: byDifficulty.map((r) => ({ value: r._id, count: r.n })),
    total,
  };
}

/* Drop empty-string optionals so they don't persist as "" in Mongo. */
function clean<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = { ...data };
  for (const k of ["answer", "subject", "topic", "sourceTitle"]) {
    if (out[k] === "") out[k] = undefined;
  }
  if (Array.isArray(out.options) && out.options.length === 0) {
    out.options = undefined;
  }
  return out as T;
}

function serialise(doc: Record<string, unknown> & { _id: mongoose.Types.ObjectId }) {
  const { _id, __v: _ignored, ...rest } = doc as Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    __v?: number;
  };
  return { id: String(_id), ...rest };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
