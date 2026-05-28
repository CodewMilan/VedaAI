import { Router, type Request, type Response } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { Assignment } from "../models/Assignment";
import { CreateAssignmentSchema } from "../types";
import { generationQueue } from "../queue";
import { extractText } from "../services/fileExtractor";
import { redis } from "../config/redis";

/* Memory storage — uploads never touch disk. Required for serverless /
   ephemeral-filesystem hosts (Railway, Render, Vercel). The buffer is
   handed to extractText() once and discarded. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("text/") ||
      /\.(pdf|txt|md|csv)$/i.test(file.originalname);
    if (!ok) {
      cb(new Error("Only PDF or text files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const assignmentsRouter = Router();

assignmentsRouter.post(
  "/",
  upload.single("material"),
  async (req: Request, res: Response) => {
    try {
      const raw = req.body ?? {};

      // Form fields arrive as strings via multer; parse JSON-encoded bits.
      const parsedBody = {
        title: raw.title,
        subject: raw.subject,
        classGrade: raw.classGrade,
        dueDate: raw.dueDate,
        duration: raw.duration,
        questionTypes: safeJson(raw.questionTypes),
        difficultyMix: safeJson(raw.difficultyMix),
        additionalInstructions: raw.additionalInstructions,
      };

      const parsed = CreateAssignmentSchema.safeParse(parsedBody);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          issues: parsed.error.issues,
        });
      }

      let uploadedMaterial: Record<string, unknown> | undefined;
      if (req.file) {
        const text = await extractText(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
        uploadedMaterial = {
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          extractedText: text,
        };
      }

      const doc = await Assignment.create({
        ...parsed.data,
        classGrade: parsed.data.classGrade || undefined,
        duration: parsed.data.duration || undefined,
        additionalInstructions: parsed.data.additionalInstructions || undefined,
        uploadedMaterial,
        status: "queued",
        progress: 0,
        stage: "queued",
      });

      const job = await generationQueue.add(
        "generate",
        { assignmentId: doc._id.toString() },
        { jobId: doc._id.toString() }
      );

      doc.jobId = String(job.id);
      await doc.save();

      return res.status(201).json(serialise(doc));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.error("[POST /assignments] failed:", message);
      return res.status(500).json({ error: message });
    }
  }
);

assignmentsRouter.get("/", async (_req, res) => {
  const docs = await Assignment.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(docs.map(serialiseLean));
});

assignmentsRouter.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const cacheKey = `vedaai:assignment:${req.params.id}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(JSON.parse(cached));
  }
  const doc = await Assignment.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  const serialised = serialiseLean(doc);
  if (doc.status === "completed") {
    redis
      .set(cacheKey, JSON.stringify(serialised), "EX", 60 * 5)
      .catch(() => {});
  }
  res.setHeader("X-Cache", "MISS");
  res.json(serialised);
});

assignmentsRouter.post("/:id/regenerate", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const doc = await Assignment.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  doc.status = "queued";
  doc.progress = 0;
  doc.stage = "queued";
  doc.error = undefined;
  doc.result = undefined;
  await doc.save();

  await redis.del(`vedaai:assignment:${doc._id.toString()}`).catch(() => {});

  // Use a unique job id so BullMQ doesn't dedupe with the previous run.
  const job = await generationQueue.add(
    "generate",
    { assignmentId: doc._id.toString(), bypassCache: true },
    { jobId: `${doc._id.toString()}:${Date.now()}` }
  );
  doc.jobId = String(job.id);
  await doc.save();

  res.json(serialise(doc));
});

assignmentsRouter.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  await Assignment.findByIdAndDelete(req.params.id);
  await redis.del(`vedaai:assignment:${req.params.id}`).catch(() => {});
  res.status(204).end();
});

function safeJson(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function serialise(doc: any) {
  const obj = doc.toObject();
  return serialiseLean(obj);
}

function serialiseLean(doc: any) {
  const { _id, __v, uploadedMaterial, groupIds, ...rest } = doc;
  return {
    id: String(_id),
    ...rest,
    groupIds: Array.isArray(groupIds) ? groupIds.map(String) : [],
    uploadedMaterial: uploadedMaterial
      ? {
          filename: uploadedMaterial.filename,
          mimeType: uploadedMaterial.mimeType,
          sizeBytes: uploadedMaterial.sizeBytes,
          hasExtractedText: Boolean(uploadedMaterial.extractedText),
        }
      : undefined,
  };
}
