import { describe, expect, it } from 'vitest';
import { addDailyHabits, validDailyEntry } from '../lib/habit-daily-data';
import { dailyPresets } from '../lib/habit-daily-presets';
import { emptyHabitData, type HabitEntry } from '../lib/habit-model';
import { HABIT_STORAGE_KEY, loadHabitData } from '../lib/habit-storage';
import { commitHabitData, readHabitSnapshot, recordHabitEntry, undoHabitEntry } from '../lib/habit-transactions';

function memory() { const values = new Map<string, string>(); return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; }
const date = '2026-10-18';
const now = '2026-10-18T12:00:00.000Z';
describe('Integrasi penyimpanan sebelas kebiasaan', () => {
  it('mengaktifkan sekali tanpa entri otomatis dan tanpa mengubah snapshot asal', () => {
    const original = emptyHabitData(); const data = addDailyHabits(original, date, now);
    expect(data.habits).toHaveLength(11); expect(data.entries).toEqual([]); expect(original).toEqual(emptyHabitData());
    expect(addDailyHabits(data, date, now).habits).toEqual(data.habits);
    expect(data.habits.every((habit) => habit.scheduleHistory[0]?.schedule.kind === 'daily')).toBe(true);
    expect(data.habits.find((habit) => habit.templateId === 'daily-water')).toMatchObject({ target: 4000, unit: 'ml' });
  });
  it('menyimpan dan memuat ulang komponen tanpa mengubah v1', () => {
    const storage = memory(); storage.setItem('tumbuh-habit-v1', 'data-lama');
    const data = addDailyHabits(emptyHabitData(), date, now);
    const habit = data.habits.find((item) => item.templateId === 'daily-workout')!;
    const entry: HabitEntry = { habitId: habit.id, date, done: false, value: null, note: null, reflection: null, updatedAt: now, daily: { components: { 'pushup-subuh': 20 } } };
    const recorded = recordHabitEntry(data, entry, date); expect(recorded.ok).toBe(true); if (!recorded.ok) return;
    expect(commitHabitData(storage, readHabitSnapshot(storage), recorded.data).ok).toBe(true);
    const loaded = loadHabitData(storage); expect(loaded.status).toBe('ok'); expect(loaded.data).toEqual(recorded.data);
    expect(storage.getItem('tumbuh-habit-v1')).toBe('data-lama');
    const undone = undoHabitEntry(loaded.data, habit.id, date); expect(undone.ok && undone.data.entries).toEqual([]);
  });
  it('mempertahankan catatan waktu bangun dan informasi sesi opsional', () => {
    const storage = memory(); const data = addDailyHabits(emptyHabitData(), date, now);
    const wake = data.habits.find((item) => item.templateId === 'daily-wake-0430')!;
    const journal = data.habits.find((item) => item.templateId === 'daily-journaling-session')!;
    data.entries = [
      { habitId: wake.id, date, done: true, value: null, note: null, reflection: null, updatedAt: now, detail: { kind: 'time', event: 'wake', time: '04:30' } },
      { habitId: journal.id, date, done: true, value: null, note: null, reflection: null, updatedAt: now, daily: { duration: 5 } },
    ];
    expect(commitHabitData(storage, readHabitSnapshot(storage), data).ok).toBe(true); expect(loadHabitData(storage).data).toEqual(data);
  });
  it('menolak klaim selesai untuk workout yang baru sebagian', () => {
    const preset = dailyPresets.find((item) => item.id === 'daily-workout');
    const entry: HabitEntry = { habitId: 'workout', date, done: true, value: null, note: null, reflection: null, updatedAt: now, daily: { components: { 'pushup-subuh': 20 } } };
    expect(validDailyEntry(entry, preset)).toBe(false); expect(validDailyEntry({ ...entry, done: false }, preset)).toBe(true);
  });
  it('mewajibkan lima status tepat waktu manual untuk salat selesai', () => {
    const preset = dailyPresets.find((item) => item.id === 'daily-prayer')!;
    const components = Object.fromEntries(preset.components!.map((item) => [item.id, 1]));
    const entry: HabitEntry = { habitId: 'prayer', date, done: true, value: null, note: null, reflection: null, updatedAt: now, daily: { components } };
    expect(validDailyEntry(entry, preset)).toBe(false);
    expect(validDailyEntry({ ...entry, daily: { components, onTime: Object.fromEntries(preset.components!.map((item) => [item.id, true])) } }, preset)).toBe(true);
  });
  it('memblokir konflik snapshot tanpa menimpa catatan tab lain', () => {
    const storage = memory(); const snapshot = readHabitSnapshot(storage); storage.setItem(HABIT_STORAGE_KEY, JSON.stringify(emptyHabitData()));
    const before = storage.getItem(HABIT_STORAGE_KEY);
    expect(commitHabitData(storage, snapshot, addDailyHabits(emptyHabitData(), date, now))).toEqual({ ok: false, reason: 'conflict' });
    expect(storage.getItem(HABIT_STORAGE_KEY)).toBe(before);
  });
});
