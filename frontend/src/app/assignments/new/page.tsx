import { AppShell } from "@/components/layout/app-shell";
import { CreateAssignmentForm } from "@/components/create/create-form";

/* The form renders its own Figma-matching header (green dot + "Create
   Assignment" + subtitle + 2-segment progress bar — Figma 2:9439/45),
   so we deliberately do NOT add a page-level header here. */
export default function NewAssignmentPage() {
  return (
    <AppShell>
      <CreateAssignmentForm />
    </AppShell>
  );
}
