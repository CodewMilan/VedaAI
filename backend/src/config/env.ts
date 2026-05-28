import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/vedaai",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim()),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "openai/gpt-4o-mini",
  generationConcurrency: Number(process.env.GENERATION_CONCURRENCY ?? 2),
} as const;

export const isOpenAIEnabled = Boolean(env.openaiApiKey);
