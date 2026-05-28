import * as React from "react";
import { VedaLogo } from "@/components/brand/veda-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative background blobs to match brand */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-[#ff5623] opacity-[0.10] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full bg-[#ffb38a] opacity-[0.16] blur-3xl"
      />

      {/* Logo bar */}
      <header className="relative z-10 flex items-center px-6 py-6 sm:px-10">
        <a href="/" className="flex items-center gap-2.5">
          <VedaLogo size={36} />
          <span className="text-[20px] font-bold tracking-[-0.04em] text-foreground">
            VedaAI
          </span>
        </a>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-96px)] items-center justify-center px-4 pb-12">
        {children}
      </main>

      <footer className="relative z-10 pb-6 text-center text-[12px] text-muted-foreground">
        © {new Date().getFullYear()} VedaAI — AI Assessment Creator
      </footer>
    </div>
  );
}
