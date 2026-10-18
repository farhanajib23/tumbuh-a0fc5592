import { habitCatalog } from './habit-catalog';
import { dayProgress, findEntry, isDateKey, isScheduledOn, weekSummary } from './habit-metrics';
import { habitAtDate, type HabitData } from './habit-model';
import { HABIT_STORAGE_KEY, loadHabitData, type LoadResult, type StorageLike } from './habit-storage';

// Gunakan parser yang sama tanpa mengizinkan efek samping backup atau penulisan.
export function readHabitView(storage: Pick<StorageLike, 'getItem'> | null): LoadResult {
  if (!storage) return loadHabitData(null);
  try {
    const raw = storage.getItem(HABIT_STORAGE_KEY);
    return loadHabitData({ getItem: () => raw, setItem: () => { throw new Error('Ringkasan hanya baca'); } });
  } catch { return loadHabitData(null); }
}
export function summarizeHabitView(data: HabitData, date: string) {
  if (!isDateKey(date)) throw new Error('Tanggal ringkasan tidak valid');
  const day = dayProgress(data.habits, data.entries, date);
  const counts = { done: 0, partial: 0, recordedNotDone: 0, unrecorded: 0 };
  const measured: Array<{ id: string; name: string; target: number; unit: string | null; actual: number | null; attainment: number | null }> = [];
  for (const habit of data.habits) {
    if (!isScheduledOn(habit, date)) continue;
    const entry = findEntry(data.entries, habit.id, date);
    if (!entry) counts.unrecorded += 1;
    else if (entry.done) counts.done += 1;
    else if (entry.value !== null && entry.value > 0) counts.partial += 1;
    else counts.recordedNotDone += 1;
    const effective = habitAtDate(habit, date);
    if (habitCatalog.find((item) => item.id === habit.templateId)?.inputKind !== 'quantity' || effective.target === null || effective.target <= 0) continue;
    const actual = entry?.value ?? null;
    measured.push({ id: habit.id, name: habit.name, target: effective.target, unit: effective.unit, actual, attainment: actual === null ? null : Math.round(actual / effective.target * 1000) / 10 });
  }
  return { day, counts, measured, seven: weekSummary(data.habits, data.entries, date, 7), thirty: weekSummary(data.habits, data.entries, date, 30) };
}
