import { ComingSoon } from "@/components/layout/coming-soon";

export default function GroupsPage() {
  return (
    <ComingSoon
      title="My Groups"
      description="Organise your students into classes and sections, then assign papers directly to a group with one click."
      features={[
        "Roster import from CSV",
        "Per-group assignment templates",
        "Track submissions and average scores",
      ]}
    />
  );
}
