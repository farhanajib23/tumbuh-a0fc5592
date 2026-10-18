import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Sprout, LockKeyhole, ChevronRight, Menu, X, CircleHelp, ArrowUpRight, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { modules } from '@/lib/modules';
import { ThemeToggle } from './theme-toggle';
import './foundation.css';

const mobileLabels: Partial<Record<(typeof modules)[number]['id'], string>> = { dashboard: 'Dashboard', habit: 'Harian' };

export function AppShell({ children, title = 'Life Dashboard' }: { children: ReactNode; title?: string }) {
  const [menuOpen, setMenuOpen] = useState(false); const [aboutOpen, setAboutOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(false); const phone = useIsMobile();
  const drawer = useRef<HTMLElement>(null); const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const update = () => { setDrawerMode(query.matches); if (!query.matches) setMenuOpen(false); };
    update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!drawerMode || !menuOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : menuButton.current;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLElement>('a[href], button')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); }
      if (event.key !== 'Tab') return;
      const nodes = drawer.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]');
      const first = nodes?.[0]; const last = nodes?.[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); if (previous?.isConnected) previous.focus(); };
  }, [drawerMode, menuOpen]);
  return <div className="app-shell">
    <a className="t-skip" href="#main-content">Lewati ke konten utama</a>
    {menuOpen && drawerMode && <div className="mobile-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
    <aside ref={drawer} className={`sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Navigasi utama" role={drawerMode ? 'dialog' : undefined} aria-modal={drawerMode && menuOpen ? true : undefined} aria-hidden={drawerMode && !menuOpen ? true : undefined} inert={drawerMode && !menuOpen}>
      {drawerMode && <Button className="t-drawer-close" variant="ghost" size="icon" aria-label="Tutup navigasi" onClick={() => setMenuOpen(false)}><X aria-hidden="true" /></Button>}
      <Link to="/" className="brand" onClick={() => setMenuOpen(false)} aria-label="TUMBUH — beranda"><Sprout className="brand-symbol" strokeWidth={1.8} aria-hidden="true" /><div><div className="brand-name">TUMBUH</div><div className="brand-caption">Personal Growth Ecosystem</div></div></Link>
      <p className="sidebar-label">Ruang pertumbuhan</p><nav className="sidebar-nav">{modules.map(module => module.available ? <Link key={module.id} to={'path' in module ? module.path : '/'} className="nav-link" activeOptions={{ exact: true }} onClick={() => setMenuOpen(false)}><module.icon aria-hidden="true" />{module.name}</Link> : <Link key={module.id} to="/modul/$module" params={{ module: module.id }} className="nav-link" onClick={() => setMenuOpen(false)} title={`${module.name} — belum tersedia`}><module.icon aria-hidden="true" /><span>{module.name}</span><LockKeyhole className="nav-lock" aria-label="Belum tersedia" /></Link>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Leaf className="sidebar-note-icon" strokeWidth={1.6} aria-hidden="true" /><strong>Tumbuh dengan ritmemu.</strong><p>Tak perlu sempurna. Setiap langkah kecil punya makna.</p></div><Button variant="navigation" onClick={() => setAboutOpen(true)}><CircleHelp aria-hidden="true" />Kenali TUMBUH<ArrowUpRight className="ml-auto" aria-hidden="true" /></Button><p className="px-3 pt-3 text-xs text-muted-foreground">TUMBUH · Fondasi awal</p></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="breadcrumb"><Button ref={menuButton} variant="ghost" size="icon" className="mobile-menu" aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</Button><span>Ruang pertumbuhan</span><ChevronRight size={12} className="crumb-chevron" aria-hidden="true" /><strong>{title}</strong></div><div className="topbar-end"><ThemeToggle /><span className="phase-badge"><i className="phase-dot" />Tahap awal</span><div className="avatar-mark" aria-label="TUMBUH"><Sprout size={17} aria-hidden="true" /></div></div></header><main className="content" id="main-content" tabIndex={-1}>{children}</main></div>
    {phone && <nav className="t-mobile-nav" aria-label="Navigasi mobile">{modules.filter(module => module.available).map(module => <Link key={module.id} to={'path' in module ? module.path : '/'} activeOptions={{ exact: true }} onClick={() => setMenuOpen(false)}><module.icon size={20} aria-hidden="true" /><span>{mobileLabels[module.id] ?? module.name}</span></Link>)}<button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}><Menu size={20} aria-hidden="true" /><span>Menu</span></button></nav>}
    <Dialog open={aboutOpen} onOpenChange={setAboutOpen}><DialogContent className="max-w-md"><Sprout className="text-primary" size={32} aria-hidden="true" /><DialogTitle>Selamat datang di TUMBUH</DialogTitle><DialogDescription className="leading-relaxed">Ruang untuk memahami diri, bertindak dengan sadar, dan belajar dari kehidupan. Kamu boleh bertumbuh dengan ritmemu sendiri.</DialogDescription><p className="text-sm leading-relaxed">Dashboard merangkum workspace habit v2 yang tersimpan pada browser ini. Rutinitas lama v1 tetap terpisah. Modul lain yang bertanda terkunci belum tersedia. Data habit lokal belum memiliki sinkronisasi akun.</p><Button onClick={() => setAboutOpen(false)}>Kembali ke perjalananmu</Button></DialogContent></Dialog>
  </div>;
}
