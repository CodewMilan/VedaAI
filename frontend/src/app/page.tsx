import { AppShell } from "@/components/layout/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function HomePage() {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
