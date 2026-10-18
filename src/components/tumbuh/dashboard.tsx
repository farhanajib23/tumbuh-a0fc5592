import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Sun, CalendarDays, Sprout, Target, Plus, LockKeyhole, ArrowUpRight, Check, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { modules } from '@/lib/modules';
import { HabitDashboardSummary } from './habit-dashboard-summary';
import landscape from '@/assets/growth-landscape.jpg';

export function Dashboard() {
  const [focusInfo, setFocusInfo] = useState(false); const [date, setDate] = useState('');
  useEffect(() => { setDate(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())); }, []);
  return <>
    <div className="page-heading"><div><h1>Life Dashboard</h1><p>Ruang untuk melihat diri, satu langkah pada satu waktu.</p></div><div className="date-label"><CalendarDays size={14} aria-hidden="true" /><span>{date || 'Hari ini'}</span></div></div>
    <section className="welcome-banner" aria-label="Sapaan TUMBUH"><img src={landscape} alt="Perbukitan hijau dengan jalan kecil di antara pepohonan" width={1600} height={608} /><div className="welcome-copy"><div className="eyebrow"><Sun size={14} aria-hidden="true" />Hari baru, kesempatan baru</div><h2>Selamat datang di TUMBUH.</h2><p>Ambil jeda sejenak. Kenali dirimu hari ini, lalu mulai dari satu langkah kecil yang berarti.</p><div className="welcome-foot"><Sprout size={13} aria-hidden="true" />Perjalanan ini milikmu. Tidak perlu terburu-buru.</div></div></section>
    <HabitDashboardSummary />
    <div className="summary-grid"><section className="summary-card"><div className="card-heading"><h2><Target aria-hidden="true" />Fokus hari ini</h2><span className="small-label">Belum ditentukan</span></div><div className="focus-content"><div className="empty-icon"><Target size={23} strokeWidth={1.5} aria-hidden="true" /></div><div><h3>Apa yang berarti untukmu hari ini?</h3><p>Satu fokus kecil bisa menjadi awal perubahan yang baik.</p></div></div><Button className="focus-action min-h-11" onClick={() => setFocusInfo(true)}><Plus size={14} aria-hidden="true" />Tentukan fokus hari ini</Button></section><section className="summary-card"><div className="card-heading"><h2><Sprout aria-hidden="true" />Langkah berikutnya</h2></div><p className="my-5 text-sm leading-relaxed">Pilih kebiasaan yang relevan, catat pelaksanaan, lalu tinjau pengalamanmu. Angka bukan penilaian dirimu.</p><Link className="t-action" to="/habit">Buka kebiasaan harian</Link><p className="mt-3 text-xs leading-relaxed">Fokus harian masih berupa panduan, bukan fitur penyimpanan baru.</p></section></div>
    <section className="modules-section" aria-labelledby="module-heading"><div className="section-heading"><div><h2 id="module-heading">Ruang untuk bertumbuh</h2><p>Berbagai sisi kehidupan, dalam satu perjalanan.</p></div><span className="section-caption">8 modul · 1 perjalanan</span></div><div className="modules-grid">{modules.map(module => {
      const body = <><div className="module-top"><div className={`module-icon tone-${module.tone}`}><module.icon strokeWidth={1.7} aria-hidden="true" /></div><ArrowUpRight className="module-arrow" aria-hidden="true" /></div><h3>{module.name}</h3><p>{module.description}</p><span className={`module-status ${module.available ? 'is-available' : ''}`}>{module.available ? <><Check aria-hidden="true" />Tersedia</> : <><LockKeyhole aria-hidden="true" />Belum tersedia</>}</span></>;
      return module.available ? <Link key={module.id} to={'path' in module ? module.path : '/'} className="module-card" aria-label={`${module.name} — tersedia`}>{body}</Link> : <Link key={module.id} to="/modul/$module" params={{ module: module.id }} className="module-card" aria-label={`${module.name} — belum tersedia`}>{body}</Link>;
    })}</div></section>
    <footer className="dashboard-footer"><span><Heart size={12} aria-hidden="true" />Bertumbuh bukan tentang menjadi sempurna, tetapi menjadi lebih sadar.</span><span>Pelan-pelan, tetap bertumbuh.</span></footer>
    <Dialog open={focusInfo} onOpenChange={setFocusInfo}><DialogContent className="max-w-md"><div className="empty-icon"><Target aria-hidden="true" /></div><DialogTitle>Ruang untuk fokusmu sedang disiapkan</DialogTitle><DialogDescription className="leading-relaxed">Fitur menentukan dan menyimpan fokus hari ini belum tersedia pada tahap awal ini. Tidak ada data yang dibuat atau disimpan.</DialogDescription><p className="text-sm text-muted-foreground leading-relaxed">Untuk sekarang, luangkan waktu sejenak: satu hal apa yang ingin kamu beri perhatian hari ini?</p><Button onClick={() => setFocusInfo(false)}>Mengerti</Button></DialogContent></Dialog>
  </>;
}
