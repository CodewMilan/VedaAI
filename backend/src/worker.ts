import { Worker } from "bullmq";
import { connectDb } from "./config/db";
import { bullConnection } from "./config/redis";
import { env } from "./config/env";
import {
  GENERATION_QUEUE_NAME,
  type GenerationJobData,
} from "./queue";
import { Assignment } from "./models/Assignment";
import { generatePaper } from "./services/aiClient";
import { publishAssignmentEvent } from "./realtime/socketClient";
import type { CreateAssignmentInput } from "./types";

async function main() {
  await connectDb();

  const worker = new Worker<GenerationJobData>(
    GENERATION_QUEUE_NAME,
    async (job) => {
      const { assignmentId, bypassCache } = job.data;
      console.log(
        `[worker] picked up job=${job.id} assignment=${assignmentId}`
      );

      const doc = await Assignment.findById(assignmentId);
      if (!doc) throw new Error(`Assignment ${assignmentId} not found`);

      const updateProgress = async (
        progress: number,
        stage: string,
        message?: string
      ) => {
        doc.progress = progress;
        doc.stage = stage;
        doc.status = "processing";
        await doc.save();
        await publishAssignmentEvent({
          assignmentId,
          status: "processing",
          progress,
          stage,
          message,
        });
        await job.updateProgress(progress);
      };

      try {
        await updateProgress(10, "preparing", "Preparing your input…");

        const input: CreateAssignmentInput & { extractedText?: string } = {
          title: doc.title,
          subject: doc.subject,
          classGrade: doc.classGrade ?? undefined,
          dueDate: doc.dueDate,
          duration: doc.duration ?? undefined,
          questionTypes: doc.questionTypes.map((q) => ({
            type: q.type as CreateAssignmentInput["questionTypes"][number]["type"],
            count: q.count,
            marks: q.marks,
          })),
          difficultyMix: {
            easy: doc.difficultyMix?.easy ?? 40,
            moderate: doc.difficultyMix?.moderate ?? 40,
            hard: doc.difficultyMix?.hard ?? 20,
          },
          additionalInstructions: doc.additionalInstructions ?? undefined,
          extractedText: doc.uploadedMaterial?.extractedText ?? undefined,
        };

        await updateProgress(35, "generating", "Asking the AI to draft questions…");

        const paper = await generatePaper(input, { bypassCache });

        await updateProgress(85, "validating", "Validating and structuring the paper…");

        doc.result = paper as typeof doc.result;
        doc.status = "completed";
        doc.progress = 100;
        doc.stage = "completed";
        doc.error = undefined;
        await doc.save();

        await publishAssignmentEvent({
          assignmentId,
          status: "completed",
          progress: 100,
          stage: "completed",
          result: paper,
        });

        return { ok: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] job=${job.id} failed:`, message);
        doc.status = "failed";
        doc.error = message;
        doc.progress = 100;
        doc.stage = "failed";
        await doc.save();
        await publishAssignmentEvent({
          assignmentId,
          status: "failed",
          progress: 100,
          stage: "failed",
          error: message,
        });
        throw err;
      }
    },
    {
      connection: bullConnection,
      concurrency: env.generationConcurrency,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] completed job=${job.id}`);
  });
  worker.on("failed", (job, err) => {
    console.error(
      `[worker] failed job=${job?.id ?? "?"}:`,
      err.message
    );
  });

  console.log(
    `[worker] ready (concurrency=${env.generationConcurrency}) listening on queue=${GENERATION_QUEUE_NAME}`
  );

  const shutdown = async () => {
    console.log("[worker] shutting down…");
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
