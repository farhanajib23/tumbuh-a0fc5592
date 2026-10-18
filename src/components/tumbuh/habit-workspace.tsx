import { useEffect, useRef, useState } from 'react';
import { BookOpen, Heart, Sprout, Target, Users } from 'lucide-react';
import { habitCatalog, habitCategories } from '@/lib/habit-catalog';
import { addDays, dateKey, dayProgress, findEntry, isDateKey, isScheduledOn, parseDateKey, weekSummary } from '@/lib/habit-metrics';
import { createHabitId, describeHabitTarget, emptyHabitData, habitAtDate, isSleepTarget, reviseHabitTarget, type Habit, type HabitData, type HabitEntry, type SleepTarget, type TargetValue } from '@/lib/habit-model';
import { HABIT_STORAGE_KEY, type StorageLike } from '@/lib/habit-storage';
import { commitHabitData, readHabitSnapshot, recordHabitEntry, undoHabitEntry, type HabitSnapshot } from '@/lib/habit-transactions';
import { HabitEntryEditor } from './habit-entry-editor';
import { HabitTargetPanel } from './habit-target-panel';
import { HabitTracker } from './habit-tracker';

const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${action} bg-primary text-primary-foreground`;
const input = 'text-input mt-1 min-h-11';
const card = 'rounded-lg border border-border bg-card p-5 sm:p-6';
const muted = 'text-sm leading-relaxed text-muted-foreground';
const icons = [Heart, BookOpen, Sprout, Target, Users];
const targets: Record<string, number> = { 'daily-movement': 20, reading: 15, 'skill-practice': 20, 'focus-session': 25 };
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
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
  const showCatalog = data.habits.length === 0 || catalogOpen;
  const visible = data.habits.filter((habit) => (category === 'all' || habit.categoryId === category) && habit.name.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="mx-auto max-w-6xl space-y-8">
    <section className="rounded-lg border border-border bg-secondary p-5 sm:p-8"><p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Sprout size={18} aria-hidden="true" />Langkah kecil, alasan yang berarti</p><h1 className="text-2xl font-bold sm:text-3xl">Kebiasaan yang tumbuh bersamamu</h1><p className={`mt-3 max-w-2xl ${muted}`}>Kenali alasanmu, lakukan yang realistis, lalu pelajari pengalamanmu. Satu hari terlewat bukan berarti kamu gagal.</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Data tersimpan di browser ini, tidak tersinkronisasi antarperangkat dan tidak terenkripsi oleh fitur ini. Gunakan perangkat bersama dengan hati-hati.</p></section>
    {(error || !writable) && <div role="alert" className="rounded-lg border border-destructive bg-card p-4 text-sm">{error || 'Penulisan diblokir karena data belum siap atau membutuhkan pemulihan. Data asli tidak ditimpa.'}</div>}
    <p role="status" aria-live="polite" className="text-sm text-primary">{message}</p>
    <div className="flex flex-wrap items-center gap-2"><button type="button" className={action} aria-label="Tanggal sebelumnya" onClick={() => setDate(addDays(date, -1))}>Sebelumnya</button><label className="sr-only" htmlFor="habit-date">Tanggal pencatatan</label><input id="habit-date" className={`${input} w-auto max-w-full`} type="date" value={date} max={today} onChange={(event) => { if (isDateKey(event.target.value) && event.target.value <= today) setDate(event.target.value); }} /><button type="button" className={action} aria-label="Tanggal berikutnya" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>Berikutnya</button><button type="button" className={action} onClick={() => setDate(dateKey(new Date()))}>Hari ini</button><button type="button" className={action} onClick={reload}>Muat ulang data</button></div>
    <section className={card} aria-label="Progres tanggal dipilih"><h2 className="text-lg font-bold">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(parseDateKey(date))}</h2><p className={`mt-2 ${muted}`}>{progress.done} selesai dari {progress.scheduled} kebiasaan terjadwal.</p><p className="mt-3 text-3xl font-bold text-primary">{progress.percent === null ? '—' : `${progress.percent}%`}</p>{progress.percent !== null && <progress className="mt-4 h-3 w-full" style={{ accentColor: 'var(--primary)' }} max={100} value={progress.percent} aria-label="Persentase pelaksanaan terjadwal" />}<p className="mt-2 text-xs leading-relaxed text-muted-foreground">{progress.percent === null ? 'Tidak ada jadwal pada tanggal ini; bukan kegagalan.' : 'Persentase mengukur pelaksanaan terjadwal, bukan hasil kehidupan. Suasana hati apa pun dihitung sebagai check-in.'}</p></section>
    <div className="flex flex-wrap gap-3"><label className="min-w-0 flex-1"><span className="sr-only">Cari kebiasaan aktif</span><input className={input} placeholder="Cari kebiasaan aktif…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span className="sr-only">Filter kategori kebiasaan</span><select className={input} value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Semua kategori</option>{habitCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" className={action} aria-expanded={showCatalog} onClick={() => setCatalogOpen(!catalogOpen)}>Pilih kebiasaan</button></div>
    {data.habits.length === 0 && <p className={muted}>Mulai dengan dua atau tiga kebiasaan yang relevan; memilih satu pun boleh.</p>}
    {data.habits.length > 0 && visible.length === 0 && <p className={`rounded-lg border border-dashed border-border p-6 ${muted}`}>Tidak ada kebiasaan yang cocok. Ubah pencarian atau kategori.</p>}
    {habitCategories.map((group, index) => {
      const habits = visible.filter((habit) => habit.categoryId === group.id); if (!habits.length) return null; const Icon = icons[index] ?? Sprout;
      return <section key={group.id} className="space-y-4" aria-label={group.name}><h2 className="flex items-center gap-2 text-lg font-bold"><Icon size={20} className="text-primary" aria-hidden="true" />{group.name}</h2><div className="grid gap-4 lg:grid-cols-2">{habits.map((habit) => {
        const entry = findEntry(data.entries, habit.id, date); const scheduled = isScheduledOn(habit, date); const effective = habitAtDate(habit, date);
        const state = !scheduled ? 'Tidak dijadwalkan' : !entry ? 'Belum dicatat' : entry.done ? 'Selesai' : entry.detail?.kind === 'time' ? 'Tercatat di luar toleransi' : entry.value !== null && entry.value > 0 ? 'Tercatat sebagian' : 'Tidak dilakukan';
        return <article key={habit.id} className={`min-w-0 rounded-lg border border-border p-5 ${entry?.done ? 'bg-secondary' : 'bg-card'}`}><div className="flex flex-wrap justify-between gap-2"><h3 className="text-base font-bold">{habit.name}</h3><span className="rounded-md border border-border px-2 py-1 text-xs">{state}</span></div><p className={`mb-4 mt-2 ${muted}`}>Target pada tanggal dipilih: {describeHabitTarget(effective)}</p><HabitEntryEditor key={`${habit.id}-${date}-${entry?.updatedAt ?? 'empty'}`} habit={effective} entry={entry} date={date} disabled={!writable || !scheduled} onSave={record} onUndo={() => { if (entry?.detail && !window.confirm('Hapus catatan pribadi pada tanggal ini? Teks yang dihapus tidak dapat dipulihkan melalui undo.')) return; const changed = undoHabitEntry(data, habit.id, date); if (changed.ok) persist(changed.data); }} /><HabitTargetPanel key={`${habit.id}-${today}-${habit.updatedAt}`} habit={habit} today={today} disabled={!writable} onChange={(from, goal) => changeTarget(habit.id, from, goal)} /><details className="mt-4 border-t border-border pt-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Alasan dan jadwal</summary><p className={`break-words ${muted}`}>{habit.purpose || 'Alasan pribadi belum diisi.'}</p><p className="mt-2 text-xs text-muted-foreground">Jadwal sejak aktivasi: {habit.scheduleHistory[0]?.schedule.kind === 'days' ? habit.scheduleHistory[0].schedule.days.map((day) => dayNames[day]).join(', ') : 'Setiap hari'}. Target adalah komitmen pelaksanaan, bukan jaminan hasil.</p></details></article>;
      })}</div></section>;
    })}
    {showCatalog && <section className={`space-y-4 ${card}`} aria-label="Katalog kebiasaan"><h2 className="text-xl font-bold">Mulai dari yang bermakna</h2><p className={muted}>Pilih hingga tiga per langkah. Target awal adalah contoh yang dapat disesuaikan, bukan aturan universal.</p><fieldset><legend className="mb-2 text-sm font-semibold">Hari untuk seluruh kebiasaan dalam pilihan ini</legend><div className="flex flex-wrap gap-2">{dayNames.map((name, day) => <label key={name} className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm"><input type="checkbox" checked={days.includes(day)} disabled={!writable} onChange={() => setDays((previous) => previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day])} />{name}</label>)}</div></fieldset><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{habitCatalog.map((template) => {
      const added = data.habits.some((habit) => habit.templateId === template.id); const chosen = selected.includes(template.id);
      return <div key={template.id} className={`min-w-0 rounded-lg border p-4 ${chosen ? 'border-primary bg-secondary' : 'border-border'}`}><p className="mb-2 text-xs text-muted-foreground">{habitCategories.find((item) => item.id === template.categoryId)?.name}</p><label className="flex min-h-11 cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-primary" aria-label={`Pilih ${template.name}`} checked={chosen} disabled={!writable || added || (!chosen && selected.length >= 3)} onChange={() => setSelected((previous) => previous.includes(template.id) ? previous.filter((id) => id !== template.id) : [...previous, template.id])} /><span className="text-sm font-bold">{template.name}</span></label><p className={muted}>{template.purpose}</p>{added && <p className="mt-2 text-xs text-primary">Sudah ditambahkan.</p>}{chosen && <div className="mt-3 space-y-3"><label className="block text-sm">Alasan pribadi untuk {template.name}<input className={input} maxLength={500} value={purposes[template.id] ?? ''} onChange={(event) => setPurposes({ ...purposes, [template.id]: event.target.value })} /></label>{template.inputKind === 'quantity' && <label className="block text-sm">Target menit untuk {template.name}<input className={input} type="number" min="1" value={customTargets[template.id] ?? String(targets[template.id] ?? 1)} onChange={(event) => setCustomTargets({ ...customTargets, [template.id]: event.target.value })} /></label>}{template.inputKind === 'time' && <><label className="block text-sm">Jenis waktu Tidur Konsisten<select className={input} value={sleepTarget.event} onChange={(event) => setSleepTarget({ ...sleepTarget, event: event.target.value === 'wake' ? 'wake' : 'bedtime' })}><option value="bedtime">Mulai tidur</option><option value="wake">Bangun</option></select></label><label className="block text-sm">Target waktu Tidur Konsisten<input className={input} type="time" value={sleepTarget.time} onChange={(event) => setSleepTarget({ ...sleepTarget, time: event.target.value })} /></label><label className="block text-sm">Toleransi menit Tidur Konsisten<input className={input} type="number" min="0" max="180" step="1" value={Number.isNaN(sleepTarget.toleranceMinutes) ? '' : sleepTarget.toleranceMinutes} onChange={(event) => setSleepTarget({ ...sleepTarget, toleranceMinutes: event.target.value === '' ? Number.NaN : Number(event.target.value) })} /></label><p className="text-xs text-muted-foreground">Jam dan toleransi di atas hanya contoh; sesuaikan dengan kebutuhanmu.</p></>}</div>}</div>;
    })}</div><button type="button" className={primary} disabled={!writable || selected.length === 0 || days.length === 0} onClick={activate}>Aktifkan {selected.length} kebiasaan</button></section>}
    <section className={card} aria-label="Ringkasan tujuh hari"><h2 className="text-lg font-bold">Tujuh hari, satu kesempatan belajar</h2><p className={`mt-2 ${muted}`}>{week.scheduled === 0 ? 'Belum ada jadwal untuk diringkas.' : `${week.done} dari ${week.scheduled} kesempatan terjadwal selesai (${week.percent}%). Ini pelaksanaan, bukan penilaian dirimu.`}</p><div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">{week.days.map((day) => <button key={day.date} type="button" className={`${action} flex-col px-2 ${day.date === date ? 'bg-secondary text-primary' : 'bg-background'}`} onClick={() => setDate(day.date)} aria-label={`Lihat tanggal ${day.date}`}><span>{parseDateKey(day.date).getDate()}</span><span className="text-xs">{day.scheduled ? `${day.done}/${day.scheduled}` : '—'}</span></button>)}</div><p className="mt-3 text-xs text-muted-foreground">Tanda — berarti tidak ada jadwal. Jeda–lanjut, arsip, dan refleksi mingguan belum tersedia.</p></section>
    <details className={card} onToggle={(event) => setLegacyOpen(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Buka pustaka aktivitas dan rutinitas lama</summary><p className={`my-4 ${muted}`}>Data v1 tetap terpisah. Tidak ada migrasi atau penghapusan otomatis ke workspace baru.</p>{legacyOpen && <HabitTracker />}</details>
  </div>;
}
