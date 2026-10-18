import { describe, expect, it } from 'vitest';
import { addDays, currentRun, dateKey, dayProgress, isDateKey, isScheduledOn, parseDateKey, weekSummary } from '@/lib/habit-metrics';
import type { Habit, HabitEntry } from '@/lib/habit-model';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1', templateId: null, name: 'Membaca', categoryId: 'learning', purpose: '', unit: 'menit', target: 15,
  status: 'active', inactiveFrom: null, scheduleHistory: [{ from: '2026-10-01', schedule: { kind: 'daily' } }],
  reminderTime: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...over,
});
const entry = (date: string, over: Partial<HabitEntry> = {}): HabitEntry => ({
  habitId: 'h1', date, done: true, value: null, note: null, reflection: null, updatedAt: '', ...over,
});

describe('Tanggal', () => {
  it('bolak-balik kunci tanggal dan menolak tanggal tidak valid', () => {
    expect(dateKey(parseDateKey('2026-03-29'))).toBe('2026-03-29');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('2026-10-17')).toBe(true);
  });
});

describe('Jadwal', () => {
  it('membedakan hari terjadwal dan tidak terjadwal', () => {
    const h = habit({ scheduleHistory: [{ from: '2026-10-01', schedule: { kind: 'days', days: [1, 3, 5] } }] });
    expect(isScheduledOn(h, '2026-10-16')).toBe(true);
    expect(isScheduledOn(h, '2026-10-17')).toBe(false);
    expect(isScheduledOn(h, '2026-09-30')).toBe(false);
  });

  it('perubahan jadwal tidak mengubah riwayat sebelumnya', () => {
    const h = habit({ scheduleHistory: [
      { from: '2026-10-01', schedule: { kind: 'daily' } },
      { from: '2026-10-10', schedule: { kind: 'days', days: [1] } },
    ] });
    expect(isScheduledOn(h, '2026-10-08')).toBe(true);
    expect(isScheduledOn(h, '2026-10-11')).toBe(false);
    expect(isScheduledOn(h, '2026-10-12')).toBe(true);
  });

  it('jeda berlaku mulai tanggalnya dan tidak menghapus hari sebelumnya', () => {
    const h = habit({ status: 'paused', inactiveFrom: '2026-10-15' });
    expect(isScheduledOn(h, '2026-10-14')).toBe(true);
    expect(isScheduledOn(h, '2026-10-15')).toBe(false);
  });
});

describe('Progres', () => {
  it('menghitung persentase hanya dari habit terjadwal', () => {
    const habits = [habit(), habit({ id: 'h2' })];
    const entries = [entry('2026-10-17')];
    expect(dayProgress(habits, entries, '2026-10-17')).toEqual({ scheduled: 2, done: 1, percent: 50 });
  });

  it('mengembalikan null bila tidak ada yang terjadwal, bukan 0 atau 100', () => {
    expect(dayProgress([], [], '2026-10-17').percent).toBeNull();
    expect(weekSummary([], [], '2026-10-17').percent).toBeNull();
  });

  it('ringkasan tujuh hari memakai penyebut hari terjadwal', () => {
    const summary = weekSummary([habit()], [entry('2026-10-16'), entry('2026-10-17')], '2026-10-17');
    expect(summary.days).toHaveLength(7);
    expect(summary).toMatchObject({ scheduled: 7, done: 2, percent: 29 });
  });

  it('pelaksanaan pada hari tidak terjadwal tidak menambah penyebut atau pembilang', () => {
    const h = habit({ scheduleHistory: [{ from: '2026-10-01', schedule: { kind: 'days', days: [1] } }] });
    expect(dayProgress([h], [entry('2026-10-17')], '2026-10-17')).toEqual({ scheduled: 0, done: 0, percent: null });
  });
});

describe('Rangkaian', () => {
  it('hari ini yang belum diisi tidak memutus rangkaian', () => {
    expect(currentRun(habit(), [entry('2026-10-15'), entry('2026-10-16')], '2026-10-17')).toBe(2);
  });

  it('melewati hari tidak terjadwal dan berhenti pada hari terjadwal yang terlewat', () => {
    const h = habit({ scheduleHistory: [{ from: '2026-10-01', schedule: { kind: 'days', days: [1, 3, 5] } }] });
    const entries = [entry('2026-10-16'), entry('2026-10-14'), entry('2026-10-12')];
    expect(currentRun(h, entries, '2026-10-17')).toBe(3);
  });
});
