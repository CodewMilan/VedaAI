/**
 * Lightweight socket client used by the worker process to emit
 * events to the API process via Redis pub/sub.
 */
import { redis } from "../config/redis";
import type { SocketAssignmentEvent } from "../types";

export const SOCKET_PUBSUB_CHANNEL = "vedaai:assignment-events";

export async function publishAssignmentEvent(
  event: SocketAssignmentEvent
): Promise<void> {
  await redis.publish(SOCKET_PUBSUB_CHANNEL, JSON.stringify(event));
}
