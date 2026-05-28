"use client";

import * as React from "react";
import { toast } from "sonner";
import { LogOut, Mail, User as UserIcon, Loader2, Check } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useUser, userDisplay } from "@/lib/auth/use-user";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { user, refresh, signOut } = useUser();
  const display = userDisplay(user);

  const [name, setName] = React.useState(display.name);
  const [school, setSchool] = React.useState(display.school);
  const [saving, setSaving] = React.useState(false);

  // Keep form in sync when the user finally arrives from Supabase
  React.useEffect(() => {
    setName(display.name);
    setSchool(display.school);
  }, [display.name, display.school]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase isn't configured.");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name, school },
      });
      if (error) throw error;
      await refresh();
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Manage your account, profile, and workspace."
      />

      <div className="mx-auto grid max-w-3xl gap-5">
        {/* Profile */}
        <section className="rounded-2xl bg-white p-6 card-shadow sm:p-8">
          <header className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0ea] text-[#ff5623]">
              <UserIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-[-0.02em] text-foreground">
                Profile
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Shown on your sidebar and in shared assignments.
              </p>
            </div>
          </header>

          <form onSubmit={save} className="space-y-4">
            <Field label="Full name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLS}
                placeholder="Your name"
              />
            </Field>
            <Field label="School / Organization">
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className={INPUT_CLS}
                placeholder="Where you teach"
              />
            </Field>
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={display.email}
                  disabled
                  className={INPUT_CLS + " pl-10 disabled:cursor-not-allowed disabled:opacity-70"}
                />
              </div>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                Email is fixed once verified.
              </p>
            </Field>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#181818] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Save changes
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Session */}
        <section className="rounded-2xl bg-white p-6 card-shadow sm:p-8">
          <header className="mb-5">
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-foreground">
              Session
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Sign out of this device. You'll need to verify by email again to come back.
            </p>
          </header>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dcdcdc] bg-white px-5 text-[14px] font-medium text-foreground transition-colors hover:bg-[#fdecec] hover:border-[#f3c8c8] hover:text-[#c53535]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </section>
      </div>
    </AppShell>
  );
}

/* ─────────── bits ─────────── */
const INPUT_CLS =
  "block h-11 w-full rounded-xl border border-[#e0e0e0] bg-white px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground focus-visible:border-[#ff5623] focus-visible:ring-2 focus-visible:ring-[#ff5623]/15 focus-visible:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto mb-8 flex max-w-3xl items-start gap-3">
      <span className="mt-[10px] h-2 w-2 shrink-0 rounded-full bg-[#ff5623]" />
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
