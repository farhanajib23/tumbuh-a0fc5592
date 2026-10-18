import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/tumbuh/app-shell";
import { HabitWorkspace } from "@/components/tumbuh/habit-workspace";
import { pageMeta } from "@/lib/modules";

export const Route = createFileRoute("/habit")({
  head: () => pageMeta("Kebiasaan & Rutinitas", "Pilih kebiasaan yang bermakna, catat tindakan, dan pelajari pengalamanmu bersama TUMBUH."),
  component: HabitPage,
});

function HabitPage() {
  return <AppShell title="Kebiasaan & Rutinitas"><HabitWorkspace /></AppShell>;
}
