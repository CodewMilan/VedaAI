"use client";

import { create } from "zustand";
import type { Group } from "@/lib/types";
import { listGroups } from "@/lib/api";

interface GroupsState {
  byId: Record<string, Group>;
  order: string[];
  loaded: boolean;
  loading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  upsert: (g: Group) => void;
  remove: (id: string) => void;
  /* Adjust the cached assignmentCount in place — called after bulk
     assign/unassign so the dashboard chip stays in sync without a
     full refetch. Pass `delta = +1` to add, `-1` to remove. */
  bumpAssignmentCount: (groupId: string, delta: number) => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  byId: {},
  order: [],
  loaded: false,
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const list = await listGroups();
      const byId: Record<string, Group> = {};
      const order: string[] = [];
      for (const g of list) {
        byId[g.id] = g;
        order.push(g.id);
      }
      set({ byId, order, loaded: true, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load";
      set({ loading: false, error: message });
    }
  },

  upsert: (g) => {
    const state = get();
    const existing = state.byId[g.id];
    const order = existing ? state.order : [g.id, ...state.order];
    set({ byId: { ...state.byId, [g.id]: g }, order });
  },

  remove: (id) => {
    const state = get();
    if (!state.byId[id]) return;
    const next = { ...state.byId };
    delete next[id];
    set({ byId: next, order: state.order.filter((x) => x !== id) });
  },

  bumpAssignmentCount: (groupId, delta) => {
    const state = get();
    const g = state.byId[groupId];
    if (!g) return;
    const updated: Group = {
      ...g,
      assignmentCount: Math.max(0, g.assignmentCount + delta),
    };
    set({ byId: { ...state.byId, [groupId]: updated } });
  },
}));
