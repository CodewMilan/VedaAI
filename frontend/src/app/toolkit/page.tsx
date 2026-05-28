import { ComingSoon } from "@/components/layout/coming-soon";

export default function ToolkitPage() {
  return (
    <ComingSoon
      title="AI Teacher's Toolkit"
      description="A growing collection of teacher-grade AI tools beyond paper generation."
      features={[
        "Auto-grade short and long answers",
        "Generate lesson plans and lecture notes",
        "Convert your notes into flashcards",
        "Explain a concept at multiple levels of difficulty",
      ]}
    />
  );
}
