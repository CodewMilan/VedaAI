"use client";

import { create } from "zustand";
import type {
  LibraryFacets,
  LibraryQuery,
  LibraryQuestion,
} from "@/lib/types";
import { listLibraryQuestions } from "@/lib/api";

const EMPTY_FACETS: LibraryFacets = {
  subjects: [],
  types: [],
  difficulties: [],
  total: 0,
};

interface LibraryState {
  items: LibraryQuestion[];
  facets: LibraryFacets;
  query: LibraryQuery;
  loaded: boolean;
  loading: boolean;
  error: string | null;

  /* Monotonic token so a slow earlier request can't overwrite a newer one. */
  reqId: number;

  fetch: (query?: LibraryQuery) => Promise<void>;
  setQuery: (patch: Partial<LibraryQuery>) => void;
  upsert: (q: LibraryQuestion) => void;
  addMany: (qs: LibraryQuestion[]) => void;
  remove: (id: string) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  facets: EMPTY_FACETS,
  query: {},
  loaded: false,
  loading: false,
  error: null,
  reqId: 0,

  fetch: async (query) => {
    const q = query ?? get().query;
    const reqId = get().reqId + 1;
    set({ loading: true, error: null, reqId, query: q });
    try {
      const res = await listLibraryQuestions(q);
      /* Ignore stale responses (a newer fetch already fired). */
      if (get().reqId !== reqId) return;
      set({
        items: res.items,
        facets: res.facets,
        loaded: true,
        loading: false,
      });
    } catch (err: unknown) {
      if (get().reqId !== reqId) return;
      const message = err instanceof Error ? err.message : "Failed to load";
      set({ loading: false, error: message });
    }
  },

  setQuery: (patch) => {
    const next = { ...get().query, ...patch };
    /* Drop empty values so they don't get serialised as blank params. */
    (Object.keys(next) as (keyof LibraryQuery)[]).forEach((k) => {
      if (!next[k]) delete next[k];
    });
    get().fetch(next);
  },

  upsert: (q) => {
    const state = get();
    const exists = state.items.some((x) => x.id === q.id);
    set({
      items: exists
        ? state.items.map((x) => (x.id === q.id ? q : x))
        : [q, ...state.items],
    });
  },

  addMany: (qs) => {
    if (!qs.length) return;
    const state = get();
    const existing = new Set(state.items.map((x) => x.id));
    const fresh = qs.filter((q) => !existing.has(q.id));
    set({ items: [...fresh, ...state.items] });
  },

  remove: (id) => {
    const state = get();
    set({ items: state.items.filter((x) => x.id !== id) });
  },
}));
