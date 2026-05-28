import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto mt-8 max-w-xl">
        <div className="overflow-hidden rounded-3xl bg-white p-10 text-center card-shadow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f0f0] text-muted-foreground">
            <FileQuestion className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-foreground">
            Page not found
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            That page doesn't exist. Head back to your assignments.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#181818] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#303030]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
