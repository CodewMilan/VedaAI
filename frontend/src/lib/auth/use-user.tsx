"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

interface UserContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const UserContext = React.createContext<UserContextValue | null>(null);

export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = React.useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = React.useState(!initialUser);

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowser();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: UserContextValue = {
    user,
    loading,
    signOut: async () => {
      if (!isSupabaseConfigured) return;
      const supabase = getSupabaseBrowser();
      await supabase.auth.signOut();
      window.location.assign("/auth/signin");
    },
    refresh: async () => {
      if (!isSupabaseConfigured) return;
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    },
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = React.useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return ctx;
}

/**
 * Pull a friendly display name + initials out of a Supabase user record.
 * Falls back gracefully for users who signed up before adding metadata.
 */
export function userDisplay(user: User | null | undefined) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.display_name === "string" && meta.display_name) ||
    user?.email?.split("@")[0] ||
    "Teacher";
  const school =
    (typeof meta.school === "string" && meta.school) ||
    (typeof meta.organization === "string" && meta.organization) ||
    "Educator";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? "")
    .join("") || "U";
  return { name, school, initials, email: user?.email ?? "" };
}
