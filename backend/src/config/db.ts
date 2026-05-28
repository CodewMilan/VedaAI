import mongoose from "mongoose";
import { env } from "./env";

let isConnected = false;

export async function connectDb() {
  if (isConnected) return mongoose.connection;
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    const safeUri = env.mongoUri.replace(/\/\/.*@/, "//***@");
    console.log(`[db] connected to ${safeUri}`);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException & { code?: string })?.code;
    if (code === "ECONNREFUSED" || (err instanceof Error && err.message.includes("ECONNREFUSED"))) {
      console.warn(
        `[db] ⚠  Cannot reach MongoDB at ${env.mongoUri}\n` +
        `       → Start it with:  docker compose up -d\n` +
        `       → Or set MONGODB_URI in backend/.env to point to your instance`
      );
    } else {
      console.warn("[db] connection failed:", (err as Error).message);
    }
    console.warn("[db] continuing without database — API calls requiring DB will fail");
  }
  return mongoose.connection;
}

export async function disconnectDb() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
