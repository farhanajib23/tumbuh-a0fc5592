import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Heart, RefreshCw, Search, Sprout, Target, Users } from 'lucide-react';
import { habitCatalog, habitCategories } from '@/lib/habit-catalog';
import { addDays, dateKey, dayProgress, findEntry, isDateKey, isScheduledOn, parseDateKey, weekSummary } from '@/lib/habit-metrics';
import { createHabitId, describeHabitTarget, emptyHabitData, habitAtDate, isSleepTarget, reviseHabitTarget, type Habit, type HabitData, type HabitEntry, type SleepTarget, type TargetValue } from '@/lib/habit-model';
import { HABIT_STORAGE_KEY, type StorageLike } from '@/lib/habit-storage';
import { commitHabitData, readHabitSnapshot, recordHabitEntry, undoHabitEntry, type HabitSnapshot } from '@/lib/habit-transactions';
import { HabitEntryEditor } from './habit-entry-editor';
import { CategoryChips, DotStrip, HabitHero, ProgressRing, WeekStrip, recentDays } from './habit-overview';
import { HabitTargetPanel } from './habit-target-panel';
import { HabitTracker } from './habit-tracker';
import './habit-premium.css';

const input = 'text-input mt-1 min-h-11';
const icons = [Heart, BookOpen, Sprout, Target, Users];
const targets: Record<string, number> = { 'daily-movement': 20, reading: 15, 'skill-practice': 20, 'focus-session': 25 };
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const privacy = 'Data tersimpan di browser ini, tidak tersinkronisasi antarperangkat dan tidak terenkripsi oleh fitur ini. Gunakan perangkat bersama dengan hati-hati.';
const errors: Record<string, string> = { unavailable: 'Penyimpanan browser tidak tersedia. Perubahan belum disimpan.', 'recovery-required': 'Data membutuhkan pemulihan; penulisan diblokir agar data asli tidak tertimpa.', conflict: 'Data berubah di tab lain. Muat ulang data sebelum mencoba lagi; input belum disimpan.', 'invalid-data': 'Data belum sesuai format. Perubahan tidak disimpan.', quota: 'Penyimpanan penuh. Perubahan belum disimpan; cadangkan data sebelum menghapus penyimpanan browser.', unknown: 'Penyimpanan gagal. Perubahan belum disimpan.' };

export function HabitWorkspace() {
  const [snapshot, setSnapshot] = useState<HabitSnapshot | null>(null); const storage = useRef<StorageLike | null>(null);
  const [today, setToday] = useState(''); const [date, setDate] = useState('');
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<Record<string, string>>({}); const [customTargets, setCustomTargets] = useState<Record<string, string>>({});
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [sleepTarget, setSleepTarget] = useState<SleepTarget>({ event: 'bedtime', time: '22:00', toleranceMinutes: 30 });
  const [catalogOpen, setCatalogOpen] = useState(false); const [legacyOpen, setLegacyOpen] = useState(false);
  const [stale, setStale] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  function reload() {
    try { storage.current = window.localStorage; } catch { storage.current = null; }
    setSnapshot(readHabitSnapshot(storage.current)); setStale(false); setMessage(''); setError('');
  }
  useEffect(() => {
    reload();
    function refreshDate() { const key = dateKey(new Date()); setToday(key); setDate((previous) => previous || key); }
    function externalChange(event: StorageEvent) { if (event.key === HABIT_STORAGE_KEY || event.key === null) { setStale(true); setMessage(''); setError(errors['conflict'] ?? 'Data berubah di tab lain.'); } }
    refreshDate(); const timer = window.setInterval(refreshDate, 60000);
    window.addEventListener('focus', refreshDate); window.addEventListener('storage', externalChange);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshDate); window.removeEventListener('storage', externalChange); };
  }, []);
  const data = snapshot?.loaded.data ?? emptyHabitData(); const status = snapshot?.loaded.status;
  const writable = !stale && (status === 'ok' || status === 'empty');
  function persist(next: HabitData): boolean {
    setMessage('');
    if (!snapshot || !writable) { setError('Penyimpanan belum siap. Muat ulang data sebelum melanjutkan.'); return false; }
    const result = commitHabitData(storage.current, snapshot, next);
    if (!result.ok) { setError(errors[result.reason] ?? 'Perubahan belum disimpan.'); if (result.reason === 'conflict') setStale(true); return false; }
    setSnapshot(result.snapshot); setError(''); setMessage('Perubahan tersimpan di browser ini.'); return true;
  }
  function activate() {
    const templates = habitCatalog.filter((item) => selected.includes(item.id));
    if (templates.length < 1 || templates.length > 3 || days.length === 0) { setMessage(''); setError('Pilih satu sampai tiga kebiasaan dan minimal satu hari.'); return; }
    const now = new Date(); const start = dateKey(now); const additions: Habit[] = [];
    for (const template of templates) {
      if (data.habits.some((habit) => habit.templateId === template.id)) { setError('Kebiasaan sudah ditambahkan.'); return; }
      const numeric = template.inputKind === 'quantity' ? Number(customTargets[template.id] ?? targets[template.id] ?? 1) : null;
      if (numeric !== null && (!Number.isFinite(numeric) || numeric <= 0)) { setError('Target harus lebih dari nol.'); return; }
      if (template.inputKind === 'time' && !isSleepTarget(sleepTarget)) { setError('Periksa target waktu dan toleransi 0–180 menit.'); return; }
      additions.push({ id: createHabitId(), templateId: template.id, name: template.name, categoryId: template.categoryId, purpose: purposes[template.id]?.trim() ?? '', unit: numeric === null ? null : 'menit', target: numeric, status: 'active', inactiveFrom: null, scheduleHistory: [{ from: start, schedule: days.length === 7 ? { kind: 'daily' } : { kind: 'days', days: [...days].sort() } }], reminderTime: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), ...(template.inputKind === 'time' ? { sleepTarget: { ...sleepTarget } } : {}) });
    }
    if (persist({ ...data, habits: [...data.habits, ...additions] })) { setSelected([]); setCatalogOpen(false); setDate(start); }
  }
  function record(entry: HabitEntry): boolean {
    const changed = recordHabitEntry(data, entry, dateKey(new Date()));
    if (!changed.ok) { setMessage(''); setError(changed.reason === 'not-scheduled' ? 'Kebiasaan tidak dijadwalkan pada tanggal ini.' : 'Periksa tanggal dan nilai pencatatan.'); return false; }
    return persist(changed.data);
  }
  function changeTarget(habitId: string, from: string, goal: TargetValue): boolean {
    const changed = reviseHabitTarget(data, habitId, from, goal, dateKey(new Date()));
    if (!changed.ok) { setMessage(''); setError(changed.reason === 'past-date' ? 'Target baru berlaku paling cepat besok; riwayat tidak diubah.' : changed.reason === 'existing-entry' ? 'Ada catatan pada periode target tersebut. Perubahan diblokir agar catatan tidak berubah makna.' : 'Periksa target, satuan, tanggal berlaku, dan toleransi waktu.'); return false; }
    if (!persist(changed.data)) return false;
    setMessage(`Target dijadwalkan mulai ${from}. Target dan catatan sebelumnya tetap.`); return true;
  }
  if (!snapshot || !date) return <p role="status" className="py-8 text-muted-foreground">Menyiapkan ruang kebiasaanmu…</p>;
  const progress = dayProgress(data.habits, data.entries, date); const week = weekSummary(data.habits, data.entries, date);
  const unrecorded = data.habits.filter((habit) => isScheduledOn(habit, date) && !findEntry(data.entries, habit.id, date)).length;
  const showCatalog = data.habits.length === 0 || catalogOpen;
  const visible = data.habits.filter((habit) => (category === 'all' || habit.categoryId === category) && habit.name.toLowerCase().includes(query.trim().toLowerCase()));
  const dateLabel = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(parseDateKey(date));
  return <div className="hp-root">
    <HabitHero dateLabel={dateLabel} progress={progress} unrecorded={unrecorded} weekPercent={week.percent} privacy={privacy} />
    {(error || !writable) && <div role="alert" className="hp-alert">{error || 'Penulisan diblokir karena data belum siap atau membutuhkan pemulihan. Data asli tidak ditimpa.'}</div>}
    <p role="status" aria-live="polite" className="hp-status">{message}</p>
    <div className="hp-datebar">
      <button type="button" className="hp-btn" aria-label="Tanggal sebelumnya" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} aria-hidden="true" /><span className="hp-hide-sm">Sebelumnya</span></button>
      <label className="sr-only" htmlFor="habit-date">Tanggal pencatatan</label>
      <input id="habit-date" className="text-input min-h-11 w-auto max-w-full" type="date" value={date} max={today} onChange={(event) => { if (isDateKey(event.target.value) && event.target.value <= today) setDate(event.target.value); }} />
      <button type="button" className="hp-btn" aria-label="Tanggal berikutnya" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}><span className="hp-hide-sm">Berikutnya</span><ChevronRight size={16} aria-hidden="true" /></button>
      <button type="button" className="hp-btn is-primary" onClick={() => setDate(dateKey(new Date()))}>Hari ini</button>
      <button type="button" className="hp-btn" onClick={reload}><RefreshCw size={15} aria-hidden="true" />Muat ulang data</button>
    </div>
    <section className="hp-section hp-rise" style={{ '--i': 1 } as CSSProperties} aria-label="Ringkasan tujuh hari">
      <h2 className="hp-section-title">Tujuh hari, satu kesempatan belajar</h2>
      <p className="hp-muted">{week.scheduled === 0 ? 'Belum ada jadwal untuk diringkas.' : `${week.done} dari ${week.scheduled} kesempatan terjadwal selesai (${week.percent}%). Ini pelaksanaan, bukan penilaian dirimu.`}</p>
      <WeekStrip days={week.days} selected={date} today={today} onSelect={setDate} />
      <p className="hp-muted">Tanda — berarti tidak ada jadwal. Jeda–lanjut, arsip, dan refleksi mingguan belum tersedia.</p>
    </section>
    <div className="hp-toolbar">
      <label className="hp-search"><span className="sr-only">Cari kebiasaan aktif</span><Search size={16} aria-hidden="true" /><input placeholder="Cari kebiasaan aktif…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <button type="button" className="hp-btn is-primary" aria-expanded={showCatalog} onClick={() => setCatalogOpen(!catalogOpen)}>Pilih kebiasaan</button>
    </div>
    <CategoryChips habits={data.habits} value={category} onChange={setCategory} />
    {data.habits.length === 0 && <p className="hp-empty">Mulai dengan dua atau tiga kebiasaan yang relevan; memilih satu pun boleh.</p>}
    {data.habits.length > 0 && visible.length === 0 && <p className="hp-empty">Tidak ada kebiasaan yang cocok. Ubah pencarian atau kategori.</p>}
    {habitCategories.map((group, index) => {
      const habits = visible.filter((habit) => habit.categoryId === group.id); if (!habits.length) return null; const Icon = icons[index] ?? Sprout;
      return <section key={group.id} className={`hp-section hp-tone-${group.id}`} aria-label={group.name}>
        <h2 className="hp-section-title"><span className="hp-section-icon"><Icon size={19} aria-hidden="true" /></span>{group.name}</h2>
        <div className="hp-grid">{habits.map((habit, position) => {
          const entry = findEntry(data.entries, habit.id, date); const scheduled = isScheduledOn(habit, date); const effective = habitAtDate(habit, date);
          const state = !scheduled ? 'Tidak dijadwalkan' : !entry ? 'Belum dicatat' : entry.done ? 'Selesai' : entry.detail?.kind === 'time' ? 'Tercatat di luar toleransi' : entry.value !== null && entry.value > 0 ? 'Tercatat sebagian' : 'Tidak dilakukan';
          const ring = effective.target !== null && entry?.value != null ? Math.min(100, Math.round((entry.value / effective.target) * 100)) : entry?.done ? 100 : 0;
          return <article key={habit.id} className={`hp-card hp-rise hp-tone-${habit.categoryId} ${entry?.done ? 'is-done' : ''}`} style={{ '--i': position + 2 } as CSSProperties}>
            <div className="hp-card-head">
              <ProgressRing percent={ring} size={46} stroke={5} decorative>{entry?.done ? '✓' : ''}</ProgressRing>
              <div className="hp-card-title"><h3>{habit.name}</h3><span className={`hp-badge ${entry?.done ? 'is-done' : ''}`}>{state}</span></div>
            </div>
            <p className="hp-card-target">Target pada tanggal dipilih: {describeHabitTarget(effective)}</p>
            <DotStrip days={recentDays(habit, data.entries, date)} />
            <HabitEntryEditor key={`${habit.id}-${date}-${entry?.updatedAt ?? 'empty'}`} habit={effective} entry={entry} date={date} disabled={!writable || !scheduled} onSave={record} onUndo={() => { if (entry?.detail && !window.confirm('Hapus catatan pribadi pada tanggal ini? Teks yang dihapus tidak dapat dipulihkan melalui undo.')) return; const changed = undoHabitEntry(data, habit.id, date); if (changed.ok) persist(changed.data); }} />
            <HabitTargetPanel key={`${habit.id}-${today}-${habit.updatedAt}`} habit={habit} today={today} disabled={!writable} onChange={(from, goal) => changeTarget(habit.id, from, goal)} />
            <details className="hp-details"><summary>Alasan dan jadwal</summary><p className="hp-muted break-words">{habit.purpose || 'Alasan pribadi belum diisi.'}</p><p className="hp-muted">Jadwal sejak aktivasi: {habit.scheduleHistory[0]?.schedule.kind === 'days' ? habit.scheduleHistory[0].schedule.days.map((day) => dayNames[day]).join(', ') : 'Setiap hari'}. Target adalah komitmen pelaksanaan, bukan jaminan hasil.</p></details>
          </article>;
        })}</div>
      </section>;
    })}
    {showCatalog && <section className="hp-panel hp-section" aria-label="Katalog kebiasaan">
      <h2>Mulai dari yang bermakna</h2>
      <p className="hp-muted">Pilih hingga tiga per langkah. Target awal adalah contoh yang dapat disesuaikan, bukan aturan universal.</p>
      <fieldset><legend className="mb-2 text-sm font-semibold">Hari untuk seluruh kebiasaan dalam pilihan ini</legend><div className="hp-days">{dayNames.map((name, day) => <label key={name} className="hp-pick"><input type="checkbox" checked={days.includes(day)} disabled={!writable} onChange={() => setDays((previous) => previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day])} />{name}</label>)}</div></fieldset>
      <div className="hp-catalog">{habitCatalog.map((template) => {
        const added = data.habits.some((habit) => habit.templateId === template.id); const chosen = selected.includes(template.id);
        return <div key={template.id} className={`hp-pick-card hp-tone-${template.categoryId} ${chosen ? 'is-chosen' : ''}`}>
          <p className="mb-2 text-xs text-muted-foreground">{habitCategories.find((item) => item.id === template.categoryId)?.name}</p>
          <label className="flex min-h-11 cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-primary" aria-label={`Pilih ${template.name}`} checked={chosen} disabled={!writable || added || (!chosen && selected.length >= 3)} onChange={() => setSelected((previous) => previous.includes(template.id) ? previous.filter((id) => id !== template.id) : [...previous, template.id])} /><span className="text-sm font-bold">{template.name}</span></label>
          <p className="hp-muted">{template.purpose}</p>{added && <p className="mt-2 text-xs text-primary">Sudah ditambahkan.</p>}
          {chosen && <div className="mt-3 space-y-3"><label className="block text-sm">Alasan pribadi untuk {template.name}<input className={input} maxLength={500} value={purposes[template.id] ?? ''} onChange={(event) => setPurposes({ ...purposes, [template.id]: event.target.value })} /></label>{template.inputKind === 'quantity' && <label className="block text-sm">Target menit untuk {template.name}<input className={input} type="number" min="1" value={customTargets[template.id] ?? String(targets[template.id] ?? 1)} onChange={(event) => setCustomTargets({ ...customTargets, [template.id]: event.target.value })} /></label>}{template.inputKind === 'time' && <><label className="block text-sm">Jenis waktu Tidur Konsisten<select className={input} value={sleepTarget.event} onChange={(event) => setSleepTarget({ ...sleepTarget, event: event.target.value === 'wake' ? 'wake' : 'bedtime' })}><option value="bedtime">Mulai tidur</option><option value="wake">Bangun</option></select></label><label className="block text-sm">Target waktu Tidur Konsisten<input className={input} type="time" value={sleepTarget.time} onChange={(event) => setSleepTarget({ ...sleepTarget, time: event.target.value })} /></label><label className="block text-sm">Toleransi menit Tidur Konsisten<input className={input} type="number" min="0" max="180" step="1" value={Number.isNaN(sleepTarget.toleranceMinutes) ? '' : sleepTarget.toleranceMinutes} onChange={(event) => setSleepTarget({ ...sleepTarget, toleranceMinutes: event.target.value === '' ? Number.NaN : Number(event.target.value) })} /></label><p className="text-xs text-muted-foreground">Jam dan toleransi di atas hanya contoh; sesuaikan dengan kebutuhanmu.</p></>}</div>}
        </div>;
      })}</div>
      <div><button type="button" className="hp-btn is-primary" disabled={!writable || selected.length === 0 || days.length === 0} onClick={activate}>Aktifkan {selected.length} kebiasaan</button></div>
    </section>}
    <details className="hp-panel" onToggle={(event) => setLegacyOpen(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Buka pustaka aktivitas dan rutinitas lama</summary><p className="hp-muted my-4">Data v1 tetap terpisah. Tidak ada migrasi atau penghapusan otomatis ke workspace baru.</p>{legacyOpen && <HabitTracker />}</details>
  </div>;
}
