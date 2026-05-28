"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const wsBase =
    process.env.NEXT_PUBLIC_WS_BASE ??
    process.env.NEXT_PUBLIC_API_BASE ??
    "http://localhost:4000";

  socket = io(wsBase, {
    path: "/socket.io",
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
  });

  return socket;
}
