import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/tumbuh/app-shell';
import { HabitTracker } from '@/components/tumbuh/habit-tracker';
import { pageMeta } from '@/lib/modules';

export const Route = createFileRoute('/habit')({
  head: () => pageMeta('Habit & Routine Tracker', 'Perpustakaan aktivitas kebiasaan TUMBUH dengan dasar bukti yang jelas — jelajahi, susun rutinitasmu, dan evaluasi manfaatnya.'),
  component: HabitPage,
});
function HabitPage() { return <AppShell title="Habit & Routine Tracker"><HabitTracker /></AppShell>; }
