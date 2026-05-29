"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Camera,
  Check,
  Loader2,
  LogOut,
  Mail,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useUser, userDisplay } from "@/lib/auth/use-user";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, refresh, signOut } = useUser();
  const display = userDisplay(user);

  const [name, setName] = React.useState(display.name);
  const [school, setSchool] = React.useState(display.school);
  const [avatarUrl, setAvatarUrl] = React.useState(display.avatarUrl);
  const [saving, setSaving] = React.useState(false);
  const [savingAvatar, setSavingAvatar] = React.useState(false);

  // Keep form in sync when the user finally arrives from Supabase
  React.useEffect(() => {
    setName(display.name);
    setSchool(display.school);
    setAvatarUrl(display.avatarUrl);
  }, [display.name, display.school, display.avatarUrl]);

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

  /**
   * Persist avatar to Supabase user_metadata.avatar_url.
   *
   * Passing `null` clears it. Passing a base64 data URL stores it inline —
   * we deliberately use base64 (not Supabase Storage) so the feature works
   * without the user having to provision a Storage bucket. Client-side
   * resizing keeps payloads safely under the user_metadata budget.
   */
  async function persistAvatar(dataUrl: string | null) {
    if (!isSupabaseConfigured) {
      toast.error("Supabase isn't configured.");
      return;
    }
    setSavingAvatar(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: dataUrl ?? "" },
      });
      if (error) throw error;
      await refresh();
      setAvatarUrl(dataUrl ?? "");
      toast.success(dataUrl ? "Profile picture updated" : "Profile picture removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save picture");
    } finally {
      setSavingAvatar(false);
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
          <header className="mb-6">
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-foreground">
              Profile
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Shown on your sidebar and in shared assignments.
            </p>
          </header>

          <AvatarUploader
            initials={display.initials}
            name={display.name}
            avatarUrl={avatarUrl}
            saving={savingAvatar}
            onPick={persistAvatar}
          />

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

/* ─────────────────────────────────────────────────────────────────
   Avatar uploader

   Picks an image, downsamples it to AVATAR_DIMENSION × AVATAR_DIMENSION,
   re-encodes as JPEG at AVATAR_QUALITY, and hands the resulting data URL
   up to the parent. Resizing locally keeps the payload safely below the
   Supabase user_metadata size budget and avoids requiring a Storage bucket.
   ───────────────────────────────────────────────────────────────── */

const AVATAR_DIMENSION = 256;
const AVATAR_QUALITY = 0.82;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

function AvatarUploader({
  initials,
  name,
  avatarUrl,
  saving,
  onPick,
}: {
  initials: string;
  name: string;
  avatarUrl: string;
  saving: boolean;
  onPick: (dataUrl: string | null) => void | Promise<void>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [resizing, setResizing] = React.useState(false);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("Image is too large — keep it under 8 MB.");
      return;
    }
    setResizing(true);
    try {
      const dataUrl = await resizeImage(file, AVATAR_DIMENSION, AVATAR_QUALITY);
      await onPick(dataUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't process that image");
    } finally {
      setResizing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = saving || resizing;

  return (
    <div className="mb-6 flex items-center gap-5">
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${name}'s profile picture`}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8a63] to-[#d45e3e] text-[24px] font-semibold tracking-tight text-white ring-2 ring-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          >
            {initials}
          </span>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full bg-[#181818] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#303030]",
              "disabled:cursor-not-allowed disabled:opacity-60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            {avatarUrl ? "Change photo" : "Upload photo"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onPick(null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#dcdcdc] bg-white px-4 text-[13px] font-medium text-[#5e5e5e] transition-colors hover:border-[#f3c8c8] hover:bg-[#fdecec] hover:text-[#c53535] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          PNG, JPG, or WEBP. We&rsquo;ll square-crop and resize to
          {" "}{AVATAR_DIMENSION}×{AVATAR_DIMENSION}px automatically.
        </p>
        {error && (
          <p role="alert" className="mt-1 text-[12px] font-medium text-[#c53535]">
            {error}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

/**
 * Square-crop and downsample an image file to a JPEG data URL.
 *
 * We crop to centre-square first (so the avatar always shows as a clean
 * circle regardless of source aspect ratio), then scale down to `size`px
 * on each side and re-encode as JPEG. Returns a data URL.
 */
async function resizeImage(
  file: File,
  size: number,
  quality: number
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);

    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported in this browser");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image"));
    img.src = src;
  });
}
