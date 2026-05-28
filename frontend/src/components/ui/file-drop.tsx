"use client";

import * as React from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export function FileDrop({
  file,
  onFileChange,
  accept = ".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,application/pdf,text/plain,image/*",
  maxSizeMB = 10,
  className,
}: FileDropProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null | undefined) => {
    setError(null);
    if (!f) return onFileChange(null);
    if (f.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large — max ${maxSizeMB} MB`);
      return;
    }
    onFileChange(f);
  };

  if (file) {
    const sizeKB = Math.round(file.size / 1024);
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-[#e8e8e8] bg-[#f9f9f9] p-3 pr-3.5",
          className
        )}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0ea] text-[#ff5623]">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-foreground">
            {file.name}
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground tabular-nums">
            {sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB / 1024).toFixed(1)} MB`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleFile(null)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Remove file ${file.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center",
          "transition-colors duration-150",
          dragOver
            ? "border-[#ff5623] bg-[#fff5f0]"
            : "border-[#dcdcdc] bg-[#fbfbfb] hover:border-[#ff5623]/50 hover:bg-[#fafafa]"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <UploadCloud className="h-[22px] w-[22px] text-[#5e5e5e]" />
        </div>

        <div className="space-y-1">
          <p className="text-[15px] font-semibold text-foreground">
            Choose a file or drag &amp; drop it here
          </p>
          <p className="text-[13px] text-muted-foreground">
            JPEG, PNG, PDF — up to {maxSizeMB} MB
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-[#dcdcdc] bg-white px-5 py-2 text-[13px] font-medium text-foreground transition-colors duration-150 hover:border-[#bdbdbd] hover:bg-[#f6f6f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Browse files
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-[#c53535]">
          {error}
        </p>
      )}
    </div>
  );
}
