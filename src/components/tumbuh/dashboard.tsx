import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Sun, CalendarDays, Sprout, Target, Plus, LockKeyhole, ArrowUpRight, Check, Heart, Info, ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { modules } from '@/lib/modules';
import landscape from '@/assets/growth-landscape.jpg';

export function Dashboard() {
  const [focusInfo, setFocusInfo] = useState(false);
  const [date, setDate] = useState('');
  useEffect(() => { setDate(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())); }, []);
  return <>
    <div className="page-heading"><div><h1>Life Dashboard</h1><p>Ruang untuk melihat diri, satu langkah pada satu waktu.</p></div><div className="date-label"><CalendarDays size={14} /><span>{date || 'Hari ini'}</span></div></div>
    <section className="welcome-banner" aria-label="Sapaan TUMBUH">
      <img src={landscape} alt="Perbukitan hijau dengan jalan kecil di antara pepohonan" width={1600} height={608} />
      <div className="welcome-copy"><div className="eyebrow"><Sun size={14} />Hari baru, kesempatan baru</div><h2>Selamat datang di TUMBUH.</h2><p>Ambil jeda sejenak. Kenali dirimu hari ini, lalu mulai dari satu langkah kecil yang berarti.</p><div className="welcome-foot"><Sprout size={13} />Perjalanan ini milikmu. Tidak perlu terburu-buru.</div></div>
    </section>
    <div className="summary-grid">
      <section className="summary-card"><div className="card-heading"><h2><Target />Fokus hari ini</h2><span className="small-label">Belum ditentukan</span></div><div className="focus-content"><div className="empty-icon"><Target size={23} strokeWidth={1.5} /></div><div><h3>Apa yang berarti untukmu hari ini?</h3><p>Satu fokus kecil bisa menjadi awal<br className="hidden sm:block" /> perubahan yang baik.</p></div></div><Button className="focus-action" onClick={() => setFocusInfo(true)}><Plus size={14} />Tentukan fokus hari ini</Button></section>
      <section className="summary-card"><div className="card-heading"><h2><ChartNoAxesCombined />Progres pertumbuhan</h2><span className="small-label">Belum ada data</span></div><div className="progress-content"><div className="growth-ring"><Sprout size={25} strokeWidth={1.5} /><span>Langkah awal</span></div><div className="progress-copy"><h3>Setiap perjalanan punya awal.</h3><p>Progresmu akan terlihat di sini<br className="hidden sm:block" /> saat modul pertumbuhan tersedia.</p></div></div><div className="progress-footer"><Info size={12} />Belum ada aktivitas yang tercatat.</div></section>
    </div>
    <section className="modules-section" aria-labelledby="module-heading"><div className="section-heading"><div><h2 id="module-heading">Ruang untuk bertumbuh</h2><p>Berbagai sisi kehidupan, dalam satu perjalanan.</p></div><span className="section-caption">8 modul · 1 perjalanan</span></div>
      <div className="modules-grid">{modules.map(module => {
        const body = <><div className="module-top"><div className={`module-icon tone-${module.tone}`}><module.icon strokeWidth={1.7} /></div><ArrowUpRight className="module-arrow" /></div><h3>{module.name}</h3><p>{module.description}</p><span className={`module-status ${module.available ? 'is-available' : ''}`}>{module.available ? <><Check />Kerangka tersedia</> : <><LockKeyhole />Belum tersedia</>}</span></>;
        return module.available ? <Link key={module.id} to="/" className="module-card" aria-label={`${module.name} — kerangka tersedia`}>{body}</Link> : <Link key={module.id} to="/modul/$module" params={{ module: module.id }} className="module-card" aria-label={`${module.name} — belum tersedia`}>{body}</Link>;
      })}</div>
    </section>
    <footer className="dashboard-footer"><span><Heart size={12} />Bertumbuh bukan tentang menjadi sempurna, tetapi menjadi lebih sadar.</span><span>Pelan-pelan, tetap bertumbuh.</span></footer>
    <Dialog open={focusInfo} onOpenChange={setFocusInfo}><DialogContent className="max-w-md"><div className="empty-icon"><Target /></div><DialogTitle>Ruang untuk fokusmu sedang disiapkan</DialogTitle><DialogDescription className="leading-relaxed">Fitur menentukan dan menyimpan fokus hari ini belum tersedia pada tahap awal ini. Tidak ada data yang dibuat atau disimpan.</DialogDescription><p className="text-sm text-muted-foreground leading-relaxed">Untuk sekarang, luangkan waktu sejenak: satu hal apa yang ingin kamu beri perhatian hari ini?</p><Button onClick={() => setFocusInfo(false)}>Mengerti</Button></DialogContent></Dialog>
  </>;
}
