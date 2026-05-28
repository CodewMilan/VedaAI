import { ComingSoon } from "@/components/layout/coming-soon";

export default function LibraryPage() {
  return (
    <ComingSoon
      title="My Library"
      description="Reusable question banks, reference materials, and saved templates — all in one place."
      features={[
        "Save individual questions to a personal bank",
        "Upload reference PDFs once, reuse across assignments",
        "Browse community-shared question packs",
      ]}
    />
  );
}
