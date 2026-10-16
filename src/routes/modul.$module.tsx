import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { AppShell } from '@/components/tumbuh/app-shell';
import { Button } from '@/components/ui/button';
import { findModule, pageMeta } from '@/lib/modules';

export const Route = createFileRoute('/modul/$module')({
  loader: ({ params }) => { const module = findModule(params.module); if (!module || module.available) throw notFound(); return { id: module.id, name: module.name }; },
  head: ({ loaderData }) => pageMeta(loaderData?.name ?? 'Modul tidak ditemukan', `${loaderData?.name ?? 'Modul'} di TUMBUH. Modul ini belum tersedia dan akan dikembangkan secara bertahap.`),
  component: ModulePage,
});
function ModulePage() {
  const { module: moduleId } = Route.useParams();
  const module = findModule(moduleId);
  if (!module) return null;
  return <AppShell title={module.name}><section className="placeholder-page"><div className={`module-icon tone-${module.tone}`}><module.icon /></div><span className="small-label"><LockKeyhole size={11} />Belum tersedia</span><h1>{module.name}</h1><p>{module.description}<br />Ruang ini akan dikembangkan secara bertahap. Saat ini, belum ada aktivitas atau data yang bisa ditambahkan.</p><Button asChild><Link to="/"><ArrowLeft />Kembali ke Life Dashboard</Link></Button><div className="placeholder-note">Tidak perlu terburu-buru. Perjalananmu bisa dimulai dari mengenali diri hari ini.</div></section></AppShell>;
}
