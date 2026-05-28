import http from "http";
import net from "net";
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { connectDb } from "./config/db";
import { connectRedis } from "./config/redis";
import { assignmentsRouter } from "./routes/assignments";
import { groupsRouter } from "./routes/groups";
import { initSocket } from "./realtime/socket";
import { startSocketBridge } from "./realtime/socketBridge";

/** Returns the first available TCP port starting from `start`. */
function findAvailablePort(start: number, max = 20): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port >= start + max) {
        reject(new Error(`No available port found in range ${start}–${start + max - 1}`));
        return;
      }
      const server = net.createServer();
      server.once("error", () => tryPort(port + 1));
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen(port);
    };
    tryPort(start);
  });
}

async function main() {
  await connectDb();
  await connectRedis();

  const app = express();
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/healthz", (_req, res) =>
    res.json({ ok: true, env: env.nodeEnv, time: new Date().toISOString() })
  );
  app.use("/api/assignments", assignmentsRouter);
  app.use("/api/groups", groupsRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[error]", err);
    res.status(500).json({ error: err.message ?? "Internal error" });
  });

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  await startSocketBridge();

  const port = await findAvailablePort(env.port);
  if (port !== env.port) {
    console.warn(`[api] port ${env.port} is busy — using ${port} instead`);
  }

  httpServer.listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log("[api] shutting down…");
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[api] fatal:", err);
  process.exit(1);
});
