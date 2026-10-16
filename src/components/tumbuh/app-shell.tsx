import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Sprout, LockKeyhole, ChevronRight, Menu, X, CircleHelp, ArrowUpRight, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { modules } from '@/lib/modules';

export function AppShell({ children, title = 'Life Dashboard' }: { children: ReactNode; title?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  return <div className="app-shell">
    {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
      <Link to="/" className="brand" onClick={() => setMenuOpen(false)} aria-label="TUMBUH — beranda">
        <Sprout className="brand-symbol" strokeWidth={1.8} />
        <div><div className="brand-name">TUMBUH</div><div className="brand-caption">Personal Growth Ecosystem</div></div>
      </Link>
      <p className="sidebar-label">Ruang pertumbuhan</p>
      <nav className="sidebar-nav">
        {modules.map(module => module.available ?
          <Link key={module.id} to="/" className="nav-link" activeOptions={{ exact: true }} onClick={() => setMenuOpen(false)}><module.icon />{module.name}</Link> :
          <Link key={module.id} to="/modul/$module" params={{ module: module.id }} className="nav-link" onClick={() => setMenuOpen(false)} title={`${module.name} — belum tersedia`}><module.icon /><span>{module.name}</span><LockKeyhole className="nav-lock" aria-label="Belum tersedia" /></Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><Leaf className="sidebar-note-icon" strokeWidth={1.6} /><strong>Tumbuh dengan ritmemu.</strong><p>Tak perlu sempurna. Setiap langkah kecil punya makna.</p></div>
        <Button variant="navigation" onClick={() => setAboutOpen(true)}><CircleHelp />Kenali TUMBUH<ArrowUpRight className="ml-auto" /></Button>
        <div className="px-3 pt-3 text-[9px] text-muted-foreground">TUMBUH · Fondasi awal</div>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="breadcrumb"><Button variant="ghost" size="icon" className="mobile-menu" aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button><span>Ruang pertumbuhan</span><ChevronRight size={12} className="crumb-chevron" /><strong>{title}</strong></div>
        <div className="topbar-end"><span className="phase-badge"><i className="phase-dot" />Tahap awal</span><div className="avatar-mark" aria-label="TUMBUH"><Sprout size={17} /></div></div>
      </header>
      <main className="content" id="main-content">{children}</main>
    </div>
    <Dialog open={aboutOpen} onOpenChange={setAboutOpen}><DialogContent className="max-w-md"><Sprout className="text-primary" size={32} /><DialogTitle>Selamat datang di TUMBUH</DialogTitle><DialogDescription className="leading-relaxed">Ruang untuk memahami diri, bertindak dengan sadar, dan belajar dari kehidupan. Kamu boleh bertumbuh dengan ritmemu sendiri.</DialogDescription><p className="text-sm text-muted-foreground leading-relaxed">Saat ini, TUMBUH masih dalam tahap awal. Life Dashboard tersedia sebagai kerangka; tujuh modul lainnya belum tersedia. Belum ada data pribadi yang disimpan.</p><Button onClick={() => setAboutOpen(false)}>Kembali ke perjalananmu</Button></DialogContent></Dialog>
  </div>;
}
