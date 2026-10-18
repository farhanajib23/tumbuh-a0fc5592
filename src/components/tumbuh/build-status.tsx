import { useEffect, useRef, useState } from 'react';

type CheckKind = 'idle' | 'checking' | 'match' | 'mismatch' | 'unknown' | 'unavailable';
interface BuildStatusProps { commit?: string; branch?: string; baseUrl?: string }
export function BuildStatus({ commit = import.meta.env['VITE_BUILD_SHA'], branch = import.meta.env['VITE_BUILD_BRANCH'], baseUrl = import.meta.env.BASE_URL }: BuildStatusProps) {
  const expected = typeof commit === 'string' && /^[a-f0-9]{40}$/i.test(commit) ? commit : null;
  const expectedBranch = typeof branch === 'string' && branch.length > 0 ? branch : null;
  const [check, setCheck] = useState<{ kind: CheckKind; message: string }>({ kind: 'idle', message: 'Belum diperiksa.' });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { const request = active.current; active.current = null; request?.abort(); }, []);
  async function verify(): Promise<void> {
    const request = new AbortController(); active.current?.abort(); active.current = request;
    setCheck({ kind: 'checking', message: 'Memeriksa penanda versi pada situs ini…' });
    const timer = window.setTimeout(() => request.abort(), 8000);
    try {
      const root = new URL(baseUrl, window.location.origin);
      if (root.origin !== window.location.origin) throw new Error('Asal URL tidak cocok');
      if (!root.pathname.endsWith('/')) root.pathname += '/';
      const url = new URL('preview-version.json', root); url.searchParams.set('check', expected ?? 'unknown'); url.searchParams.set('t', String(Date.now()));
      const response = await fetch(url.href, { cache: 'no-store', signal: request.signal });
      if (!response.ok) throw new Error('Penanda tidak dapat diambil');
      const payload: unknown = await response.json();
      if (typeof payload !== 'object' || payload === null) throw new Error('Format penanda tidak valid');
      const value = payload as Record<string, unknown>; const remote = value['commit']; const remoteBranch = value['branch'];
      if (typeof remote !== 'string' || !/^[a-f0-9]{40}$/i.test(remote) || typeof remoteBranch !== 'string' || remoteBranch.length === 0 || remoteBranch.length > 128) throw new Error('Format identitas tidak valid');
      if (active.current !== request) return;
      if (!expected || !expectedBranch) setCheck({ kind: 'unknown', message: `Penanda live: ${remote.slice(0, 7)}. Identitas kode yang dimuat belum tersedia; kecocokan belum dapat dipastikan.` });
      else if (remote === expected && remoteBranch === expectedBranch) setCheck({ kind: 'match', message: `Identitas build cocok: ${remote.slice(0, 7)}. Ini bukan bukti seluruh tampilan dan fitur sudah lulus pengujian.` });
      else setCheck({ kind: 'mismatch', message: `Versi berbeda: kode dimuat ${expected.slice(0, 7)}, penanda live ${remote.slice(0, 7)}. Muat ulang halaman tanpa menghapus data browser; periksa juga branch dan URL deployment.` });
    } catch {
      if (active.current === request) setCheck({ kind: 'unavailable', message: 'Penanda versi live tidak dapat diverifikasi. Ini bukan bukti situs mati. Tidak ada data habit yang diubah.' });
    } finally { window.clearTimeout(timer); if (active.current === request) active.current = null; }
  }
  return <section className="mt-8 rounded-lg border border-border bg-card p-4 text-sm" aria-label="Identitas versi aplikasi">
    <h2 className="text-sm font-semibold">Versi aplikasi</h2>
    <p className="mt-2 break-words">Kode dimuat: <code>{expected?.slice(0, 7) ?? 'tanpa penanda build'}</code> · Branch: {expectedBranch ?? 'tidak diketahui'}</p>
    <button className="t-action mt-3" type="button" disabled={check.kind === 'checking'} onClick={verify}>Periksa versi live</button>
    <p className="mt-3 leading-relaxed" role="status" aria-live="polite">{check.message}</p>
    <p className="mt-2 text-xs leading-relaxed">Pemeriksaan ini hanya mengambil metadata versi dari situs yang sama, tanpa membaca atau mengirim catatan pribadi.</p>
  </section>;
}
