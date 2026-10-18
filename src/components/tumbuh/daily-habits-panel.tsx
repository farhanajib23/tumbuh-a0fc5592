import { useEffect, useRef, useState } from 'react';
import { dailyPresets, componentProgress, type DailyPreset } from '@/lib/habit-daily-presets';
import { addDailyHabits, type DailyRecord } from '@/lib/habit-daily-data';
import { clockMinutes, emptyHabitData, habitAtDate, type Habit, type HabitData, type HabitEntry } from '@/lib/habit-model';
import { dateKey, findEntry, isDateKey, isScheduledOn } from '@/lib/habit-metrics';
import { HABIT_STORAGE_KEY, type StorageLike } from '@/lib/habit-storage';
import { commitHabitData, readHabitSnapshot, recordHabitEntry, undoHabitEntry, type HabitSnapshot } from '@/lib/habit-transactions';
import './habit-premium.css';

export function DailyHabitsPanel() {
  const storage = useRef<StorageLike | null>(null);
  const [snapshot, setSnapshot] = useState<HabitSnapshot | null>(null);
  const [date, setDate] = useState(''); const [today, setToday] = useState('');
  const [stale, setStale] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  function reload() {
    try { storage.current = window.localStorage; } catch { storage.current = null; }
    setSnapshot(readHabitSnapshot(storage.current)); setStale(false); setError(''); setMessage('');
  }
  useEffect(() => {
    reload();
    const refresh = () => { const key = dateKey(new Date()); setToday(key); setDate((previous) => previous || key); };
    const changed = (event: StorageEvent) => { if (event.key === HABIT_STORAGE_KEY || event.key === null) { setStale(true); setError('Data berubah di tab lain. Muat ulang sebelum menyimpan; input belum disimpan.'); } };
    refresh(); const timer = window.setInterval(refresh, 60000);
    window.addEventListener('storage', changed); window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('storage', changed); window.removeEventListener('focus', refresh); };
  }, []);
  const data = snapshot?.loaded.data ?? emptyHabitData();
  const writable = !stale && (snapshot?.loaded.status === 'ok' || snapshot?.loaded.status === 'empty');
  function persist(next: HabitData): boolean {
    setMessage('');
    if (!snapshot || !writable) { setError('Penyimpanan belum siap atau membutuhkan pemulihan. Data lama tidak ditimpa.'); return false; }
    const result = commitHabitData(storage.current, snapshot, next);
    if (!result.ok) { setError(`Belum tersimpan (${result.reason}). Muat ulang data setelah mengamankan input. Jangan hapus data browser.`); if (result.reason === 'conflict') setStale(true); return false; }
    setSnapshot(result.snapshot); setError(''); setMessage('Perubahan tersimpan di browser ini.'); return true;
  }
  function save(entry: HabitEntry): boolean {
    const result = recordHabitEntry(data, entry, dateKey(new Date()));
    if (!result.ok) { setError('Tanggal, jadwal, atau nilai catatan tidak valid.'); return false; }
    return persist(result.data);
  }
  if (!snapshot || !date) return <p role="status">Menyiapkan sebelas kebiasaan…</p>;
  const missing = dailyPresets.filter((preset) => !data.habits.some((habit) => habit.templateId === preset.id)).length;
  const scheduled = data.habits.filter((habit) => dailyPresets.some((preset) => preset.id === habit.templateId) && isScheduledOn(habit, date));
  const done = scheduled.filter((habit) => findEntry(data.entries, habit.id, date)?.done).length;
  return <section className="hp-root" aria-label="Sebelas kebiasaan harian pribadi">
    <header className="hp-panel"><h2>11 kebiasaan harianmu</h2><p>{done} dari {scheduled.length} kebiasaan terjadwal selesai. Belum dicatat bukan kegagalan.</p><p className="hp-muted">Data disimpan di browser ini, tidak tersinkronisasi dan tidak terenkripsi oleh fitur ini. Tidak ada alarm atau pelacakan perangkat otomatis.</p>
      {missing > 0 && <button type="button" className="hp-btn is-primary" disabled={!writable} onClick={() => persist(addDailyHabits(data, dateKey(new Date())))}>Aktifkan {missing} kebiasaan yang belum ditambahkan</button>}
      <p className="hp-muted">Aktivasi mulai hari ini tanpa membuat catatan realisasi. Kebiasaan lama tetap tersedia di tampilan kebiasaan lainnya.</p>
      <label className="block">Tanggal pencatatan<input className="text-input min-h-11" type="date" max={today} value={date} onChange={(event) => { if (isDateKey(event.target.value) && event.target.value <= today) setDate(event.target.value); }} /></label>
      <button type="button" className="hp-btn" onClick={reload}>Muat ulang data</button>
    </header>
    {(!writable || error) && <p role="alert" className="hp-alert">{error || 'Penyimpanan diblokir agar data asli tidak tertimpa.'}</p>}
    <p role="status" aria-live="polite">{message}</p>
    <div className="hp-grid">{dailyPresets.map((preset) => {
      const habit = data.habits.find((item) => item.templateId === preset.id);
      const entry = habit ? findEntry(data.entries, habit.id, date) : undefined;
      return <article className="hp-card" key={preset.id}><h3>{preset.name}</h3><p className="hp-muted">{preset.description}</p>
        {!habit ? <p>Belum diaktifkan.</p> : <DailyHabitForm key={`${habit.id}-${date}-${entry?.updatedAt ?? 'empty'}`} preset={preset} habit={habitAtDate(habit, date)} entry={entry} date={date} disabled={!writable || !isScheduledOn(habit, date)} onSave={save} onUndo={() => { const result = undoHabitEntry(data, habit.id, date); if (result.ok) persist(result.data); }} />}
      </article>;
    })}</div>
    <p className="hp-muted">Versi awal: input kuantitatif menyimpan total harian, bukan menambahkan sesi. Pengeditan target preset dan integrasi Journal belum tersedia. Jangan memaksakan target pribadi yang tidak sesuai keadaanmu.</p>
  </section>;
}
function DailyHabitForm({ preset, habit, entry, date, disabled, onSave, onUndo }: { preset: DailyPreset; habit: Habit; entry: HabitEntry | undefined; date: string; disabled: boolean; onSave: (entry: HabitEntry) => boolean; onUndo: () => void }) {
  const [value, setValue] = useState(entry?.value?.toString() ?? '');
  const [time, setTime] = useState(entry?.detail?.kind === 'time' ? entry.detail.time : '');
  const [checked, setChecked] = useState(entry?.done ?? false);
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(Object.entries(entry?.daily?.components ?? {}).map(([key, actual]) => [key, String(actual)])));
  const [onTime, setOnTime] = useState<Record<string, boolean>>(entry?.daily?.onTime ?? {});
  const [extras, setExtras] = useState<DailyRecord>({ ...(entry?.daily ?? {}) });
  const [error, setError] = useState('');
  function submit() {
    setError('');
    const next: HabitEntry = { habitId: habit.id, date, done: false, value: null, note: entry?.note ?? null, reflection: entry?.reflection ?? null, updatedAt: new Date().toISOString() };
    if (preset.kind === 'quantity') {
      const actual = Number(value);
      if (!value.trim() || !Number.isFinite(actual) || actual < 0) { setError('Masukkan angka nol atau lebih.'); return; }
      next.value = actual; next.done = actual >= (habit.target ?? preset.target ?? 1);
    } else if (preset.kind === 'time') {
      const actual = clockMinutes(time); const goal = clockMinutes(habit.sleepTarget?.time ?? '04:30');
      if (actual === null || goal === null) { setError('Masukkan waktu bangun aktual.'); return; }
      next.detail = { kind: 'time', event: 'wake', time }; next.done = actual === goal;
    } else if (preset.kind === 'components') {
      const actuals: Record<string, number> = {};
      for (const component of preset.components ?? []) {
        const text = values[component.id]; if (text === undefined || text.trim() === '') continue;
        const actual = Number(text); if (!Number.isFinite(actual) || actual < 0) { setError('Nilai komponen harus angka nol atau lebih.'); return; }
        actuals[component.id] = actual;
      }
      if (Object.keys(actuals).length === 0) { setError('Catat minimal satu komponen. Bagian kosong tetap belum dicatat.'); return; }
      next.daily = { components: actuals, ...(preset.id === 'daily-prayer' ? { onTime } : {}) };
      next.done = componentProgress(preset.components ?? [], actuals) === 'complete' && (preset.id !== 'daily-prayer' || (preset.components ?? []).every((component) => onTime[component.id] === true));
    } else next.done = checked;
    if (preset.kind !== 'components' && Object.keys(extras).length) next.daily = extras;
    if (onSave(next)) setError('');
  }
  const actual = entry?.value;
  const partial = entry && !entry.done && ((entry.value ?? 0) > 0 || Object.values(entry.daily?.components ?? {}).some((item) => item > 0));
  const status = !entry ? 'Belum dicatat' : entry.done ? 'Selesai' : preset.kind === 'time' ? 'Tercatat di luar target waktu' : partial ? 'Parsial' : 'Tidak selesai';
  const difference = clockMinutes(time) !== null ? (clockMinutes(time) ?? 0) - (clockMinutes(habit.sleepTarget?.time ?? '04:30') ?? 270) : null;
  const optional = preset.id === 'daily-learning-content' ? ['duration', 'title', 'source', 'learning'] as const : preset.id === 'daily-journaling-session' ? ['duration'] as const : preset.id === 'daily-reading-30' ? ['title', 'pages'] as const : [];
  const labels: Record<string, string> = { duration: 'Durasi opsional (menit)', title: 'Judul opsional', source: 'Sumber opsional', learning: 'Satu hal yang dipelajari (opsional)', pages: 'Halaman dibaca (opsional)' };
  return <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="space-y-3">
    <p className="hp-badge">{status}</p>
    {preset.kind === 'quantity' && <><p>Aktual: {actual ?? '—'} / {habit.target} {habit.unit}</p><label className="block">Total aktual {preset.name} ({habit.unit})<input className="text-input min-h-11" type="number" min="0" step="any" disabled={disabled} value={value} onChange={(event) => setValue(event.target.value)} /></label></>}
    {preset.kind === 'time' && <><p>Target bangun: {habit.sleepTarget?.time ?? '04:30'}</p><label className="block">Waktu bangun aktual<input className="text-input min-h-11" type="time" disabled={disabled} value={time} onChange={(event) => setTime(event.target.value)} /></label>{difference !== null && <p>Selisih input: {difference === 0 ? 'sesuai target' : `${Math.abs(difference)} menit ${difference > 0 ? 'lebih lambat' : 'lebih awal'}`} (tanggal yang sama).</p>}</>}
    {preset.kind === 'checklist' && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => setChecked(event.target.checked)} />Sesi atau tindakan {preset.name} sudah dilakukan</label>}
    {preset.kind === 'components' && <fieldset disabled={disabled} className="space-y-3 min-w-0"><legend>Catat komponen satu per satu</legend>{preset.components?.map((component) => <div key={component.id}><label className="block">{component.name} — target {component.target} {component.unit}{preset.id === 'daily-prayer' ? <select className="text-input min-h-11" value={values[component.id] ?? ''} onChange={(event) => setValues({ ...values, [component.id]: event.target.value })}><option value="">Belum dicatat</option><option value="0">Tidak dilakukan</option><option value="1">Sudah dilakukan</option></select> : <input className="text-input min-h-11" type="number" min="0" step="any" placeholder="Belum dicatat" value={values[component.id] ?? ''} onChange={(event) => setValues({ ...values, [component.id]: event.target.value })} />}</label>{preset.id === 'daily-prayer' && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={onTime[component.id] ?? false} disabled={values[component.id] !== '1'} onChange={(event) => setOnTime({ ...onTime, [component.id]: event.target.checked })} />{component.name} tepat waktu menurut catatan saya</label>}<p className="hp-muted">Tersimpan: {entry?.daily?.components?.[component.id] ?? 'Belum dicatat'} / {component.target} {component.unit}</p></div>)}</fieldset>}
    {optional.length > 0 && <details><summary>Informasi tambahan opsional</summary>{optional.map((field) => <label className="block" key={field}>{labels[field]}<input className="text-input min-h-11" disabled={disabled} type={field === 'duration' || field === 'pages' ? 'number' : 'text'} min="0" maxLength={2000} value={extras[field] ?? ''} onChange={(event) => { const next = { ...extras }; const text = event.target.value; if (text === '') delete next[field]; else if (field === 'duration' || field === 'pages') next[field] = Number(text); else next[field] = text; setExtras(next); }} /></label>)}</details>}
    {preset.id === 'daily-journaling-session' && <p className="hp-muted">Cukup catat sesi, bukan isi jurnal. Integrasi modul Journal belum tersedia.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-2"><button className="hp-btn is-primary" type="submit" disabled={disabled}>Simpan {preset.name}</button>{entry && <button className="hp-btn" type="button" disabled={disabled} onClick={onUndo}>Batalkan catatan {preset.name}</button>}</div>
    {disabled && <p className="hp-muted">Pencatatan tidak tersedia: periksa jadwal atau status penyimpanan.</p>}
  </form>;
}
