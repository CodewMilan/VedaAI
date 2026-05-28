import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const PUBLIC_PATHS = ["/auth"];

/**
 * Middleware-side Supabase session refresh + route protection.
 *
 * - Refreshes the auth cookie on every request so the SSR session stays valid.
 * - If Supabase isn't configured (no env vars), auth is bypassed entirely
 *   so the app stays runnable for the dev who hasn't set up Supabase yet.
 * - Otherwise, unauthenticated visitors get redirected to /auth/signin
 *   (preserving the original path as `?next=`).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!URL || !KEY) return response;

  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Network blip / invalid keys shouldn't 500 the entire app — fall back to
  // "no user" semantics, which just sends the visitor through the signin flow.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
