import { TopBar } from "@/components/layout/TopBar";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Projects, board health, and AI actions"
      />
      <DashboardClient />
    </>
  );
}
