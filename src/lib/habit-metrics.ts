import type { Habit, HabitEntry, Schedule } from "./habit-model";

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Pukul 12:00 lokal menghindari pergeseran tanggal saat perubahan jam musim.
export function parseDateKey(key: string): Date {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, day ?? 1, 12);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && KEY_RE.test(value) && dateKey(parseDateKey(value)) === value;
}

export function addDays(key: string, amount: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + amount);
  return dateKey(d);
}

export function activeSchedule(habit: Habit, key: string): Schedule | null {
  let found: { from: string; schedule: Schedule } | undefined;
  for (const entry of habit.scheduleHistory) {
    if (entry.from <= key && (!found || entry.from >= found.from)) found = entry;
  }
  return found ? found.schedule : null;
}

// Hanya tanggal terjadwal yang masuk penyebut; hari tidak terjadwal bukan kegagalan.
export function isScheduledOn(habit: Habit, key: string): boolean {
  const schedule = activeSchedule(habit, key);
  if (!schedule) return false;
  if (habit.inactiveFrom !== null && key >= habit.inactiveFrom) return false;
  if (schedule.kind === "daily") return true;
  return schedule.days.includes(parseDateKey(key).getDay());
}

export function findEntry(
  entries: HabitEntry[],
  habitId: string,
  key: string,
): HabitEntry | undefined {
  return entries.find((e) => e.habitId === habitId && e.date === key);
}

export interface DayProgress {
  scheduled: number;
  done: number;
  percent: number | null;
}

function toPercent(done: number, scheduled: number): number | null {
  return scheduled === 0 ? null : Math.round((done / scheduled) * 100);
}

export function dayProgress(habits: Habit[], entries: HabitEntry[], key: string): DayProgress {
  let scheduled = 0;
  let done = 0;
  for (const habit of habits) {
    if (!isScheduledOn(habit, key)) continue;
    scheduled += 1;
    if (findEntry(entries, habit.id, key)?.done) done += 1;
  }
  return { scheduled, done, percent: toPercent(done, scheduled) };
}

export interface WeekSummary extends DayProgress {
  days: Array<DayProgress & { date: string }>;
}

export function weekSummary(
  habits: Habit[],
  entries: HabitEntry[],
  endKey: string,
  length = 7,
): WeekSummary {
  const days: WeekSummary["days"] = [];
  let scheduled = 0;
  let done = 0;
  for (let i = length - 1; i >= 0; i -= 1) {
    const date = addDays(endKey, -i);
    const progress = dayProgress(habits, entries, date);
    days.push({ date, ...progress });
    scheduled += progress.scheduled;
    done += progress.done;
  }
  return { days, scheduled, done, percent: toPercent(done, scheduled) };
}

// Rangkaian hari terjadwal berturut-turut yang selesai. Hari ini yang belum diisi
// tidak memutus rangkaian, dan hari tidak terjadwal dilewati. Hanya info tambahan.
export function currentRun(habit: Habit, entries: HabitEntry[], todayKey: string): number {
  const earliest = habit.scheduleHistory.map((e) => e.from).sort()[0];
  if (earliest === undefined) return 0;
  let count = 0;
  let key = todayKey;
  for (let i = 0; i < 400 && key >= earliest; i += 1) {
    if (isScheduledOn(habit, key)) {
      if (findEntry(entries, habit.id, key)?.done) count += 1;
      else if (key !== todayKey) break;
    }
    key = addDays(key, -1);
  }
  return count;
}
