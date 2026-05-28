import IORedis from "ioredis";
import { env } from "../config/env";
import { emitAssignmentEvent } from "./socket";
import { SOCKET_PUBSUB_CHANNEL } from "./socketClient";
import type { SocketAssignmentEvent } from "../types";

/**
 * Subscribes to the worker's pub/sub channel and forwards events
 * to connected websocket clients.
 */
export async function startSocketBridge(): Promise<void> {
  const sub = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  await sub.subscribe(SOCKET_PUBSUB_CHANNEL);
  sub.on("message", (_channel, raw) => {
    try {
      const event = JSON.parse(raw) as SocketAssignmentEvent;
      emitAssignmentEvent(event);
    } catch (err) {
      console.error("[socket-bridge] failed to parse event", err);
    }
  });
  console.log("[socket-bridge] subscribed to", SOCKET_PUBSUB_CHANNEL);
}
