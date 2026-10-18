import { useState } from 'react';
import { habitCatalog } from '@/lib/habit-catalog';
import { clockMinutes, matchesSleepTarget, moodChoices, type EntryDetail, type Habit, type HabitEntry, type HabitReflection } from '@/lib/habit-model';

const button = 'inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50';
export function HabitEntryEditor({ habit, entry, date, disabled, onSave, onUndo }: {
  habit: Habit; entry: HabitEntry | undefined; date: string; disabled: boolean; onSave: (entry: HabitEntry) => boolean; onUndo: () => void;
}) {
  const kind = habitCatalog.find((item) => item.id === habit.templateId)?.inputKind;
  const [value, setValue] = useState(entry?.value?.toString() ?? '');
  const [journal, setJournal] = useState(entry?.detail?.kind === 'journal' ? entry.detail.text : '');
  const [mood, setMood] = useState(entry?.detail?.kind === 'mood' ? entry.detail.mood : '');
  const [time, setTime] = useState(entry?.detail?.kind === 'time' ? entry.detail.time : '');
  const [note, setNote] = useState(entry?.detail?.kind === 'mood' ? entry.detail.context ?? '' : entry?.note ?? '');
  const [reflection, setReflection] = useState<HabitReflection | ''>(entry?.reflection ?? '');
  const [error, setError] = useState('');
  if (!kind) return <p className="text-sm text-muted-foreground">Jenis kebiasaan ini belum dikenali; data tidak diubah.</p>;
  function submit() {
    let actual: number | null = null; let done = true; let detail: EntryDetail | undefined;
    if (kind === 'quantity') {
      actual = Number(value);
      if (!value.trim() || !Number.isFinite(actual) || actual < 0) { setError('Masukkan angka nol atau lebih.'); return; }
      done = habit.target === null ? actual > 0 : actual >= habit.target;
    } else if (kind === 'journal') {
      if (!journal.trim()) { setError('Isi jurnal terlebih dahulu; satu kalimat pun cukup.'); return; }
      detail = { kind: 'journal', text: journal.trim() };
    } else if (kind === 'mood') {
      const selectedMood = moodChoices.find((item) => item === mood);
      if (!selectedMood) { setError('Pilih suasana hati terlebih dahulu.'); return; }
      detail = { kind: 'mood', mood: selectedMood, context: note.trim() || null };
    } else if (kind === 'time') {
      if (clockMinutes(time) === null || !habit.sleepTarget) { setError('Periksa waktu aktual dan target waktu kebiasaan.'); return; }
      detail = { kind: 'time', event: habit.sleepTarget.event, time };
      done = matchesSleepTarget(time, habit.sleepTarget);
    }
    const next: HabitEntry = { habitId: habit.id, date, done, value: actual, note: kind === 'mood' ? null : note.trim() || null, reflection: reflection || null, updatedAt: new Date().toISOString(), ...(detail ? { detail } : {}) };
    if (onSave(next)) setError('');
  }
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <legend className="sr-only">Pencatatan {habit.name}</legend>
      {kind === 'quantity' && <label className="block text-sm">Nilai aktual {habit.name}<input className="text-input mt-1 min-h-11" type="number" min="0" step="any" value={value} onChange={(event) => setValue(event.target.value)} /></label>}
      {kind === 'journal' && <label className="block text-sm">Isi jurnal {habit.name}<textarea className="text-input mt-1 min-h-28" maxLength={10000} value={journal} onChange={(event) => setJournal(event.target.value)} placeholder="Apa yang ingin kamu pahami dari hari ini?" /></label>}
      {kind === 'mood' && <><label className="block text-sm">Suasana hati {habit.name}<select className="text-input mt-1 min-h-11" value={mood} onChange={(event) => setMood(event.target.value)}><option value="">Pilih suasana hati</option>{moodChoices.map((item) => <option key={item} value={item}>{item.replaceAll('-', ' ')}</option>)}</select></label><p className="text-xs leading-relaxed text-muted-foreground">Semua suasana hati dihitung sebagai check-in. Ini bukan skor keberhasilan atau diagnosis.</p></>}
      {kind === 'time' && <><label className="block text-sm">Waktu aktual {habit.name}<input className="text-input mt-1 min-h-11" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><p className="text-xs leading-relaxed text-muted-foreground">Catat {habit.sleepTarget?.event === 'wake' ? 'waktu bangun' : 'waktu mulai tidur'} pada tanggal terpilih. Waktu di luar toleransi tetap disimpan; bukan diagnosis kualitas tidur.</p></>}
      <details><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Catatan dan refleksi opsional</summary><div className="space-y-3 pt-2"><label className="block text-sm">Catatan opsional {habit.name}<textarea className="text-input mt-1 min-h-20" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label><label className="block text-sm">Refleksi {habit.name}<select className="text-input mt-1 min-h-11" value={reflection} onChange={(event) => setReflection(event.target.value as HabitReflection | '')}><option value="">Belum direfleksikan</option><option value="membantu">Membantu</option><option value="biasa">Biasa saja</option><option value="tidak-cocok">Tidak cocok untukku</option></select></label></div></details>
      {(kind === 'journal' || kind === 'mood') && <p className="text-xs leading-relaxed text-muted-foreground">Catatan pribadi tersimpan di browser ini dan tidak terenkripsi oleh fitur ini. Hindari informasi sensitif pada perangkat bersama.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="submit" className={`${button} bg-primary text-primary-foreground`}>{kind === 'binary' ? `Tandai ${habit.name} selesai` : `Simpan ${habit.name}`}</button>
        {(kind === 'quantity' || kind === 'binary') && <button type="button" className={button} onClick={() => onSave({ habitId: habit.id, date, done: false, value: null, note: note.trim() || null, reflection: reflection || null, updatedAt: new Date().toISOString() })}>Catat tidak dilakukan</button>}
        {entry && <button type="button" className={button} onClick={onUndo} aria-label={`Batalkan catatan ${habit.name}`}>Batalkan catatan</button>}
      </div>
    </fieldset>
  </form>;
}
