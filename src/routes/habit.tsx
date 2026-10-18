import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/tumbuh/app-shell';
import { HabitWorkspace } from '@/components/tumbuh/habit-workspace';
import { HabitHistory, HabitStatistics } from '@/components/tumbuh/habit-explore';
import { parseHabitSearch } from '@/lib/habit-explore';
import { pageMeta } from '@/lib/modules';

export const Route = createFileRoute('/habit')({
  validateSearch: parseHabitSearch,
  head: () => pageMeta('Kebiasaan & Rutinitas', 'Catat kebiasaan, tinjau kalender dan riwayat, serta pelajari statistik pelaksanaan tanpa menghakimi diri.'),
  component: HabitPage,
});
function HabitPage() {
  const view = Route.useSearch().view ?? 'harian';
  return <AppShell title="Kebiasaan & Rutinitas"><nav className="hx-nav" aria-label="Tampilan modul kebiasaan"><Link className="t-action" to="/habit" search={{}} aria-current={view === 'harian' ? 'page' : undefined}>Harian</Link><Link className="t-action" to="/habit" search={{ view: 'riwayat' }} aria-current={view === 'riwayat' ? 'page' : undefined}>Kalender / Riwayat</Link><Link className="t-action" to="/habit" search={{ view: 'statistik' }} aria-current={view === 'statistik' ? 'page' : undefined}>Statistik</Link></nav><p className="mb-4 text-sm text-muted-foreground">Simpan input sebelum berpindah tampilan. Filter tampilan tidak disimpan ke data habit.</p>{view === 'riwayat' ? <HabitHistory /> : view === 'statistik' ? <HabitStatistics /> : <HabitWorkspace />}</AppShell>;
}
