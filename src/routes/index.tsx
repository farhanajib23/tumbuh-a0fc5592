import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/tumbuh/app-shell';
import { Dashboard } from '@/components/tumbuh/dashboard';
import { pageMeta } from '@/lib/modules';

export const Route = createFileRoute('/')({
  head: () => pageMeta('Life Dashboard', 'TUMBUH — ruang untuk memahami diri, bertindak dengan sadar, dan bertumbuh dengan ritmemu sendiri.'),
  component: Index,
});
function Index() { return <AppShell><Dashboard /></AppShell>; }
