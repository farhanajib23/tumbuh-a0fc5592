import { habitCatalog } from "./habit-catalog";
import {
  addDays,
  dateKey,
  findEntry,
  isDateKey,
  isScheduledOn,
  parseDateKey,
  weekSummary,
} from "./habit-metrics";
import { habitAtDate, type Habit, type HabitData, type HabitEntry } from "./habit-model";

export type HabitView = "harian" | "riwayat" | "statistik";
export function parseHabitSearch(search: Record<string, unknown>): { view?: HabitView } {
  return search["view"] === "riwayat" || search["view"] === "statistik"
    ? { view: search["view"] }
    : {};
}
export type ScheduledState = "done" | "partial" | "not-done" | "unrecorded";
export type HistoryState = ScheduledState | "off-recorded" | "orphan";
export const stateLabels: Record<HistoryState, string> = {
  done: "Selesai",
  partial: "Parsial",
  "not-done": "Tidak dilakukan / di luar toleransi",
  unrecorded: "Belum dicatat",
  "off-recorded": "Catatan di luar jadwal",
  orphan: "Catatan tanpa kebiasaan",
};
export interface HistoryRow {
  date: string;
  habitId: string;
  name: string;
  habit: Habit | null;
  entry: HabitEntry | null;
  scheduled: boolean;
  state: HistoryState;
}
export function dateRange(from: string, to: string): string[] {
  if (!isDateKey(from) || !isDateKey(to) || from > to)
    throw new RangeError("Rentang tanggal tidak valid");
  const days: string[] = [];
  let key = from;
  while (days.length < 366) {
    days.push(key);
    if (key === to) return days;
    key = addDays(key, 1);
  }
  throw new RangeError("Maksimal 366 hari per pencarian");
}
export function monthCells(month: string): Array<string | null> {
  const first = `${month}-01`;
  if (!isDateKey(first)) throw new RangeError("Bulan tidak valid");
  const start = parseDateKey(first);
  const last = new Date(start);
  last.setMonth(last.getMonth() + 1);
  last.setDate(0);
  const offset = (start.getDay() + 6) % 7;
  const length = last.getDate();
  return Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, index) =>
    index < offset || index >= offset + length ? null : addDays(first, index - offset),
  );
}
export function shiftMonth(month: string, amount: number): string | null {
  if (!isDateKey(`${month}-01`)) return null;
  const date = parseDateKey(`${month}-01`);
  date.setMonth(date.getMonth() + amount);
  const key = dateKey(date);
  return isDateKey(key) ? key.slice(0, 7) : null;
}
function recordedState(entry: HabitEntry | undefined): ScheduledState {
  return !entry
    ? "unrecorded"
    : entry.done
      ? "done"
      : entry.value !== null && entry.value > 0
        ? "partial"
        : "not-done";
}
export function historyRows(
  data: HabitData,
  from: string,
  to: string,
  habitId = "all",
  state: HistoryState | "all" = "all",
): HistoryRow[] {
  const rows: HistoryRow[] = [];
  const ids = new Set(data.habits.map((habit) => habit.id));
  for (const date of dateRange(from, to))
    for (const habit of data.habits) {
      if (habitId !== "all" && habit.id !== habitId) continue;
      const entry = findEntry(data.entries, habit.id, date);
      const scheduled = isScheduledOn(habit, date);
      if (!scheduled && !entry) continue;
      rows.push({
        date,
        habitId: habit.id,
        name: habit.name,
        habit,
        entry: entry ?? null,
        scheduled,
        state: scheduled ? recordedState(entry) : "off-recorded",
      });
    }
  for (const entry of data.entries)
    if (
      !ids.has(entry.habitId) &&
      entry.date >= from &&
      entry.date <= to &&
      (habitId === "all" || habitId === entry.habitId)
    )
      rows.push({
        date: entry.date,
        habitId: entry.habitId,
        name: "Kebiasaan tidak tersedia",
        habit: null,
        entry,
        scheduled: false,
        state: "orphan",
      });
  return rows
    .filter((row) => state === "all" || row.state === state)
    .sort((a, b) => b.date.localeCompare(a.date) || a.habitId.localeCompare(b.habitId));
}
function countStates(rows: HistoryRow[]): Record<ScheduledState, number> {
  const counts = { done: 0, partial: 0, "not-done": 0, unrecorded: 0 };
  for (const row of rows)
    if (row.scheduled && row.state !== "orphan" && row.state !== "off-recorded")
      counts[row.state] += 1;
  return counts;
}
export function periodReport(data: HabitData, end: string, length: 7 | 30, habitId = "all") {
  const from = addDays(end, 1 - length);
  const rows = historyRows(data, from, end, habitId);
  const habits = data.habits.filter((habit) => habitId === "all" || habit.id === habitId);
  const perHabit = habits.map((habit) => {
    const scheduled = rows.filter((row) => row.habitId === habit.id && row.scheduled);
    const numeric =
      habitCatalog.find((template) => template.id === habit.templateId)?.inputKind === "quantity";
    const goals = scheduled.map((row) => habitAtDate(habit, row.date));
    const units = new Set(goals.map((goal) => goal.unit));
    const values = scheduled.flatMap((row) =>
      row.entry?.value === null || row.entry?.value === undefined ? [] : [row.entry.value],
    );
    const complete =
      scheduled.length > 0 &&
      units.size === 1 &&
      goals.every((goal) => goal.target !== null && goal.target > 0);
    const planned = complete ? goals.reduce((sum, goal) => sum + (goal.target ?? 0), 0) : null;
    const actual =
      values.length > 0 && units.size === 1 ? values.reduce((sum, value) => sum + value, 0) : null;
    return {
      habit,
      progress: weekSummary([habit], data.entries, end, length),
      measurement: numeric
        ? {
            planned,
            actual,
            unit: units.size === 1 ? (goals[0]?.unit ?? null) : null,
            recorded: values.length,
            scheduled: scheduled.length,
            attainment:
              planned === null || actual === null
                ? null
                : Math.round((actual / planned) * 1000) / 10,
          }
        : null,
    };
  });
  return {
    from,
    end,
    counts: countStates(rows),
    trend: weekSummary(habits, data.entries, end, length),
    ignored: rows.filter((row) => !row.scheduled).length,
    perHabit,
  };
}
