"use client";

import { create } from "zustand";
import type { Assignment, SocketAssignmentEvent } from "@/lib/types";
import { listAssignments } from "@/lib/api";
import { getSocket } from "@/lib/socket";

interface AssignmentsState {
  byId: Record<string, Assignment>;
  order: string[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  socketBound: boolean;

  fetchAll: () => Promise<void>;
  upsert: (a: Assignment) => void;
  remove: (id: string) => void;
  applyEvent: (e: SocketAssignmentEvent) => void;
  bindSocket: () => void;
}

export const useAssignmentsStore = create<AssignmentsState>((set, get) => ({
  byId: {},
  order: [],
  loaded: false,
  loading: false,
  error: null,
  socketBound: false,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const list = await listAssignments();
      const byId: Record<string, Assignment> = {};
      const order: string[] = [];
      for (const a of list) {
        byId[a.id] = a;
        order.push(a.id);
      }
      set({ byId, order, loaded: true, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load";
      set({ loading: false, error: message });
    }
  },

  upsert: (a) => {
    const state = get();
    const existing = state.byId[a.id];
    const order = existing ? state.order : [a.id, ...state.order];
    set({ byId: { ...state.byId, [a.id]: a }, order });
  },

  remove: (id) => {
    const state = get();
    if (!state.byId[id]) return;
    const next = { ...state.byId };
    delete next[id];
    set({ byId: next, order: state.order.filter((x) => x !== id) });
  },

  applyEvent: (e) => {
    const state = get();
    const existing = state.byId[e.assignmentId];
    if (!existing) return;
    const updated: Assignment = {
      ...existing,
      status: e.status,
      progress: typeof e.progress === "number" ? e.progress : existing.progress,
      stage: e.stage ?? existing.stage,
      result: e.result ?? existing.result,
      error: e.error ?? (e.status === "completed" ? undefined : existing.error),
      updatedAt: new Date().toISOString(),
    };
    set({ byId: { ...state.byId, [e.assignmentId]: updated } });
  },

  bindSocket: () => {
    if (get().socketBound) return;
    const s = getSocket();
    s.on("assignment:list-update", (e: SocketAssignmentEvent) => {
      get().applyEvent(e);
    });
    set({ socketBound: true });
  },
}));
