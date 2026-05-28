import type { Server as HTTPServer } from "http";
import { Server as SocketServer } from "socket.io";
import { env } from "../config/env";
import type { SocketAssignmentEvent } from "../types";

let io: SocketServer | null = null;

export function initSocket(httpServer: HTTPServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    socket.on("subscribe:assignment", (assignmentId: unknown) => {
      if (typeof assignmentId === "string" && assignmentId.length > 0) {
        socket.join(`assignment:${assignmentId}`);
      }
    });

    socket.on("unsubscribe:assignment", (assignmentId: unknown) => {
      if (typeof assignmentId === "string" && assignmentId.length > 0) {
        socket.leave(`assignment:${assignmentId}`);
      }
    });
  });

  console.log("[ws] Socket.io initialised");
  return io;
}

export function emitAssignmentEvent(event: SocketAssignmentEvent) {
  if (!io) return;
  io.to(`assignment:${event.assignmentId}`).emit("assignment:update", event);
  io.emit("assignment:list-update", event);
}

export function getIO(): SocketServer | null {
  return io;
}
