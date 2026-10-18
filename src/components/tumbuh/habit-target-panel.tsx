import { useState } from 'react';
import { habitCatalog } from '@/lib/habit-catalog';
import { addDays } from '@/lib/habit-metrics';
import { describeHabitTarget, habitAtDate, targetTimeline, type Habit, type SleepTarget, type TargetValue } from '@/lib/habit-model';

const button = 'inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50';
export function HabitTargetPanel({ habit, today, disabled, onChange }: { habit: Habit; today: string; disabled: boolean; onChange: (from: string, goal: TargetValue) => boolean }) {
  const kind = habitCatalog.find((item) => item.id === habit.templateId)?.inputKind;
  const tomorrow = addDays(today, 1); const next = habitAtDate(habit, tomorrow);
  const [open, setOpen] = useState(false); const [from, setFrom] = useState(tomorrow);
  const [amount, setAmount] = useState(next.target?.toString() ?? '');
  const [sleep, setSleep] = useState<SleepTarget>(next.sleepTarget ?? { event: 'bedtime', time: '22:00', toleranceMinutes: 30 });
  const [error, setError] = useState('');
  if (kind !== 'quantity' && kind !== 'time') return null;
  return <section className="mt-4 space-y-3 border-t border-border pt-3" aria-label={`Pengaturan target ${habit.name}`}>
    <details><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Riwayat target {habit.name}</summary><ol className="space-y-2 py-2 text-sm">{targetTimeline(habit).map((revision, index) => <li key={revision.from}><time dateTime={revision.from}>{revision.from}</time> · {describeHabitTarget(revision)}<span className="ml-2 text-xs text-muted-foreground">{index === 0 ? 'Target awal' : revision.from > today ? 'Terjadwal' : 'Sudah berlaku'}</span></li>)}</ol></details>
    <button type="button" className={button} disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>Ubah target {habit.name}</button>
    {open && <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      const goal: TargetValue = kind === 'quantity' ? { target: Number(amount), unit: habit.unit } : { target: null, unit: null, sleepTarget: { ...sleep } };
      if (!onChange(from, goal)) setError('Target belum disimpan. Periksa input dan pesan penyimpanan.'); else { setError(''); setOpen(false); }
    }}><fieldset disabled={disabled} className="min-w-0 space-y-3"><legend className="sr-only">Target baru {habit.name}</legend>
      <p className="text-xs leading-relaxed text-muted-foreground">Berlaku paling cepat besok. Target dan catatan tanggal sebelumnya tidak diubah. Menyimpan tanggal berlaku yang sama mengganti rencana pada tanggal tersebut, bukan catatan pelaksanaan.</p>
      <label className="block text-sm">Berlaku mulai {habit.name}<input className="text-input mt-1 min-h-11" type="date" min={tomorrow} value={from} required onChange={(event) => setFrom(event.target.value)} /></label>
      {kind === 'quantity' ? <label className="block text-sm">Target baru {habit.name}<input className="text-input mt-1 min-h-11" type="number" min="0.01" step="any" required value={amount} onChange={(event) => setAmount(event.target.value)} /><span className="text-xs text-muted-foreground">Satuan tetap: {habit.unit ?? 'tanpa satuan'}</span></label> : <>
        <label className="block text-sm">Jenis waktu baru {habit.name}<select className="text-input mt-1 min-h-11" value={sleep.event} onChange={(event) => setSleep({ ...sleep, event: event.target.value === 'wake' ? 'wake' : 'bedtime' })}><option value="bedtime">Mulai tidur</option><option value="wake">Bangun</option></select></label>
        <label className="block text-sm">Target waktu baru {habit.name}<input className="text-input mt-1 min-h-11" type="time" required value={sleep.time} onChange={(event) => setSleep({ ...sleep, time: event.target.value })} /></label>
        <label className="block text-sm">Toleransi baru {habit.name}<input className="text-input mt-1 min-h-11" type="number" min="0" max="180" step="1" required value={Number.isNaN(sleep.toleranceMinutes) ? '' : sleep.toleranceMinutes} onChange={(event) => setSleep({ ...sleep, toleranceMinutes: event.target.value === '' ? Number.NaN : Number(event.target.value) })} /></label>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" className={`${button} bg-primary text-primary-foreground`}>Jadwalkan target {habit.name}</button>
    </fieldset></form>}
  </section>;
}
