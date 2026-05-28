import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Server-side Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * Cookie writes are no-ops inside RSCs (Next throws if you call cookies().set()
 * outside an Action or Route Handler) — that's handled gracefully via try/catch.
 */
export function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    URL || "http://placeholder.supabase.co",
    KEY || "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* called from a Server Component — middleware will keep the session fresh */
          }
        },
      },
    }
  );
}
