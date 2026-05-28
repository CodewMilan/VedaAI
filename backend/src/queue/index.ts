import { Queue } from "bullmq";
import { bullConnection } from "../config/redis";

export const GENERATION_QUEUE_NAME = "assignment-generation";

export interface GenerationJobData {
  assignmentId: string;
  bypassCache?: boolean;
}

export const generationQueue = new Queue<GenerationJobData>(
  GENERATION_QUEUE_NAME,
  {
    connection: bullConnection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 60 * 60 * 24, count: 200 },
      removeOnFail: { age: 60 * 60 * 24 * 7 },
    },
  }
);
