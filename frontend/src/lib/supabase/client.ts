"use client";

import { createBrowserClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(URL && KEY);

/**
 * Browser-side Supabase client.
 *
 * Uses placeholder credentials when env vars are missing so we never
 * crash at import-time during local development. Auth flows will surface
 * a friendly error if the keys aren't actually configured.
 */
export function getSupabaseBrowser() {
  return createBrowserClient(URL || "http://placeholder.supabase.co", KEY || "placeholder-anon-key");
}
