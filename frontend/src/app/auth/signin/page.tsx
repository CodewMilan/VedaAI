"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
} from "lucide-react";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;

export default function SignInPage() {
  return (
    <React.Suspense fallback={<SignInSkeleton />}>
      <SignInInner />
    </React.Suspense>
  );
}

function SignInSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl bg-white p-8 sm:p-10 card-shadow">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-[#f0f0f0]" />
        <div className="mt-5 h-7 w-48 animate-pulse rounded bg-[#f0f0f0]" />
        <div className="mt-3 h-4 w-64 animate-pulse rounded bg-[#f0f0f0]" />
      </div>
    </div>
  );
}

function SignInInner() {
  const search = useSearchParams();
  /* Guard against open redirects — only allow same-origin relative paths */
  const rawNext = search.get("next") || "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const [step, setStep] = React.useState<"email" | "otp">("email");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [school, setSchool] = React.useState("");
  const [code, setCode] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestOtp(opts: { resend?: boolean } = {}) {
    if (!isSupabaseConfigured) {
      toast.error("Supabase isn't configured yet. Add your URL + anon key to .env.local.");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: name || undefined,
            school: school || undefined,
          },
        },
      });
      if (error) throw error;
      setStep("otp");
      setCooldown(30);
      toast.success(opts.resend ? "Sent a fresh code" : "Check your inbox for a 6-digit code");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't send code");
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(submitted?: string) {
    const finalCode = (submitted ?? code).trim();
    if (finalCode.length !== CODE_LENGTH) {
      toast.error(`Enter the ${CODE_LENGTH}-digit code`);
      return;
    }
    setVerifying(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: finalCode,
        type: "email",
      });
      if (error) throw error;
      toast.success("Welcome!");
      /* Hard navigation — `router.replace()` + `router.refresh()` triggers
         two sequential Supabase cookie-validation round-trips and a
         reconciliation between stale client state and fresh server SSR,
         which causes the visible 2-3 s "verified, then waiting" stall.
         A full reload sends the freshly-set auth cookie once and gets a
         single, snappy SSR pass. */
      window.location.replace(next);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
      setVerifying(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl bg-white p-8 sm:p-10 card-shadow">
        {step === "email" ? (
          <EmailStep
            email={email}
            setEmail={setEmail}
            name={name}
            setName={setName}
            school={school}
            setSchool={setSchool}
            sending={sending}
            onSubmit={() => requestOtp()}
          />
        ) : (
          <OtpStep
            email={email}
            code={code}
            setCode={setCode}
            verifying={verifying}
            cooldown={cooldown}
            onBack={() => {
              setStep("email");
              setCode("");
            }}
            onSubmit={() => verifyOtp()}
            onAutoSubmit={(c) => verifyOtp(c)}
            onResend={() => requestOtp({ resend: true })}
          />
        )}
      </div>

      {!isSupabaseConfigured && (
        <div className="mt-4 rounded-2xl border border-[#ffd6c5] bg-[#fff0ea] p-4 text-[12.5px] leading-relaxed text-[#7a3a1d]">
          <div className="font-semibold">Heads up — Supabase isn't configured.</div>
          Add <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          to <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">frontend/.env.local</code> and restart the dev server.
        </div>
      )}
    </div>
  );
}

/* ─────────── Step 1: Email + (optional) profile ─────────── */
function EmailStep({
  email,
  setEmail,
  name,
  setName,
  school,
  setSchool,
  sending,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  school: string;
  setSchool: (v: string) => void;
  sending: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h1 className="text-[26px] font-bold tracking-[-0.025em] text-foreground">
        Sign in to VedaAI
      </h1>
      <p className="mt-1.5 text-[14px] text-muted-foreground">
        We'll email you a one-time code — no password required.
      </p>

      <div className="mt-7 space-y-4">
        <FieldLabel htmlFor="email" required>Email</FieldLabel>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={INPUT_CLS + " pl-10"}
          />
        </div>

        {/* Optional metadata — captured on first signup, shown in the sidebar/topbar */}
        <details className="rounded-xl border border-dashed border-[#e0e0e0] bg-[#fafafa] p-3 text-[13px]">
          <summary className="cursor-pointer select-none text-foreground">
            Add your name &amp; school <span className="text-muted-foreground">(optional)</span>
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <FieldLabel htmlFor="school">School / Organization</FieldLabel>
              <input
                id="school"
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Delhi Public School"
                className={INPUT_CLS}
              />
            </div>
          </div>
        </details>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending code…
          </>
        ) : (
          <>
            Send code
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="mt-6 text-center text-[12px] text-muted-foreground">
        By continuing you agree to receive a one-time login code at the address above.
      </p>
    </form>
  );
}

/* ─────────── Step 2: OTP verify ─────────── */
function OtpStep({
  email,
  code,
  setCode,
  verifying,
  cooldown,
  onBack,
  onSubmit,
  onAutoSubmit,
  onResend,
}: {
  email: string;
  code: string;
  setCode: (v: string) => void;
  verifying: boolean;
  cooldown: number;
  onBack: () => void;
  onSubmit: () => void;
  onAutoSubmit: (c: string) => void;
  onResend: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 mb-4 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Change email
      </button>

      <h1 className="text-[26px] font-bold tracking-[-0.025em] text-foreground">
        Enter the code
      </h1>
      <p className="mt-1.5 text-[14px] text-muted-foreground">
        We sent a {CODE_LENGTH}-digit code to{" "}
        <span className="font-medium text-foreground">{email}</span>
      </p>

      <div className="mt-7">
        <OtpInput
          length={CODE_LENGTH}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (v.length === CODE_LENGTH) {
              setTimeout(() => onAutoSubmit(v), 50);
            }
          }}
        />
      </div>

      <button
        type="submit"
        disabled={verifying || code.length !== CODE_LENGTH}
        className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {verifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying…
          </>
        ) : (
          <>
            Verify &amp; continue
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
        Didn't get it?{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0}
          className="font-medium text-[#ff5623] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </form>
  );
}

/* ─────────── OTP input ─────────── */
function OtpInput({
  length,
  value,
  onChange,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = React.useMemo(() => {
    const arr = value.split("").slice(0, length);
    while (arr.length < length) arr.push("");
    return arr;
  }, [value, length]);

  const focus = (i: number) => {
    const el = refs.current[i];
    if (el) { el.focus(); el.select(); }
  };

  return (
    <div
      /* 6-column grid — each cell is exactly (width - 5*gap) / 6, never overflows */
      className="mt-2 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }}
      onPaste={(e) => {
        const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (txt.length) {
          e.preventDefault();
          onChange(txt);
          focus(Math.min(txt.length, length - 1));
        }
      }}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(-1);
            const arr = digits.slice();
            arr[i] = next;
            onChange(arr.join(""));
            if (next && i < length - 1) focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              e.preventDefault();
              const arr = digits.slice();
              arr[i - 1] = "";
              onChange(arr.join(""));
              focus(i - 1);
            }
            if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); focus(i - 1); }
            if (e.key === "ArrowRight" && i < length - 1) { e.preventDefault(); focus(i + 1); }
          }}
          className={cn(
            // base: pill-shaped, muted background, mono font
            "h-14 w-full min-w-0 rounded-2xl text-center text-[22px] font-bold tabular-nums",
            "border-2 border-transparent bg-[#f5f5f5] text-foreground",
            "transition-all duration-150 outline-none",
            // focused: white + brand orange ring
            "focus:border-[#ff5623] focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,86,35,0.10)]",
            // filled: slightly emphasise the digit
            d && "bg-white border-[#e8e8e8]"
          )}
        />
      ))}
    </div>
  );
}

/* ─────────── shared bits ─────────── */
const INPUT_CLS =
  "block h-11 w-full rounded-xl border border-[#e0e0e0] bg-white px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground focus-visible:border-[#ff5623] focus-visible:ring-2 focus-visible:ring-[#ff5623]/15 focus-visible:outline-none";

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-foreground">
      {children}
      {required && <span className="ml-0.5 text-[#c53535]">*</span>}
    </label>
  );
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
