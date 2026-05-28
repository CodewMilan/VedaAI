import IORedis from "ioredis";
import { env } from "./env";

/**
 * BullMQ requires `maxRetriesPerRequest: null` so blocking commands
 * (like brpoplpush) don't get killed mid-flight. We expose two
 * connections — a generic one (cache) and a BullMQ-tuned one.
 *
 * Both connections are configured to stop retrying quickly and suppress
 * the noisy ECONNREFUSED flood so the server can still start without Redis.
 */
const SHARED_OPTIONS = {
  lazyConnect: true,
  retryStrategy: (times: number) => {
    if (times === 1) {
      console.warn(`[redis] ⚠  Cannot reach Redis at ${env.redisUrl} — queue features will be unavailable until Redis is started.`);
    }
    if (times >= 3) return null;
    return Math.min(times * 500, 2000);
  },
};

export const redis = new IORedis(env.redisUrl, {
  ...SHARED_OPTIONS,
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
});

export const bullConnection = new IORedis(env.redisUrl, {
  ...SHARED_OPTIONS,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const logged = new Set<string>();
function onceWarn(key: string, msg: string) {
  if (!logged.has(key)) { logged.add(key); console.warn(msg); }
}

redis.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "ECONNREFUSED") {
    onceWarn("redis-refused", `[redis] connection refused — start Redis with: docker compose up -d`);
  } else {
    console.error("[redis] error:", err.message);
  }
});

bullConnection.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "ECONNREFUSED") {
    onceWarn("bull-refused", `[redis:bull] connection refused — queue workers inactive until Redis is available`);
  } else {
    console.error("[redis:bull] error:", err.message);
  }
});

/** Connect both Redis clients. Safe to call at startup; errors are non-fatal. */
export async function connectRedis() {
  try {
    await redis.connect();
    console.log(`[redis] connected to ${env.redisUrl}`);
  } catch {
    // warning already emitted by retryStrategy / error handler
  }
  try {
    await bullConnection.connect();
    console.log(`[redis:bull] connected`);
  } catch {
    // warning already emitted
  }
}
