import { habitCatalog, type HabitCategoryId } from './habit-catalog';
import { isDateKey } from './habit-metrics';

export type HabitStatus = 'active' | 'paused' | 'archived';
export type HabitReflection = 'membantu' | 'biasa' | 'tidak-cocok';
export type Schedule = { kind: 'daily' } | { kind: 'days'; days: number[] };
export interface ScheduleEntry { from: string; schedule: Schedule }
export interface SleepTarget { event: 'bedtime' | 'wake'; time: string; toleranceMinutes: number }
export interface TargetValue { target: number | null; unit: string | null; sleepTarget?: SleepTarget }
export interface TargetRevision extends TargetValue { from: string }
export const moodChoices = ['sangat-tidak-nyaman', 'tidak-nyaman', 'netral', 'nyaman', 'sangat-nyaman'] as const;
export type EntryDetail =
  | { kind: 'journal'; text: string }
  | { kind: 'mood'; mood: typeof moodChoices[number]; context: string | null }
  | { kind: 'time'; event: 'bedtime' | 'wake'; time: string };
export interface Habit {
  id: string; templateId: string | null; name: string; categoryId: HabitCategoryId;
  purpose: string; unit: string | null; target: number | null; status: HabitStatus;
  inactiveFrom: string | null; scheduleHistory: ScheduleEntry[]; reminderTime: string | null;
  createdAt: string; updatedAt: string; sleepTarget?: SleepTarget; targetHistory?: TargetRevision[];
}
export interface HabitEntry {
  habitId: string; date: string; done: boolean; value: number | null; note: string | null;
  reflection: HabitReflection | null; updatedAt: string; detail?: EntryDetail;
}
export interface HabitData { version: 2; habits: Habit[]; entries: HabitEntry[] }
export function emptyHabitData(): HabitData { return { version: 2, habits: [], entries: [] }; }
export function clockMinutes(value: unknown): number | null {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function isSleepTarget(value: unknown): value is SleepTarget {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (v['event'] === 'bedtime' || v['event'] === 'wake') && clockMinutes(v['time']) !== null &&
    typeof v['toleranceMinutes'] === 'number' && Number.isInteger(v['toleranceMinutes']) && v['toleranceMinutes'] >= 0 && v['toleranceMinutes'] <= 180;
}
export function isEntryDetail(value: unknown): value is EntryDetail {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v['kind'] === 'journal') return typeof v['text'] === 'string' && v['text'].trim().length > 0 && v['text'].length <= 10000;
  if (v['kind'] === 'mood') return moodChoices.some((mood) => mood === v['mood']) &&
    (v['context'] === null || (typeof v['context'] === 'string' && v['context'].length <= 2000));
  return v['kind'] === 'time' && (v['event'] === 'bedtime' || v['event'] === 'wake') && clockMinutes(v['time']) !== null;
}
export function matchesSleepTarget(time: string, target: SleepTarget): boolean {
  const actual = clockMinutes(time); const goal = clockMinutes(target.time);
  if (actual === null || goal === null || !isSleepTarget(target)) return false;
  const difference = Math.abs(actual - goal);
  return Math.min(difference, 1440 - difference) <= target.toleranceMinutes;
}
export function createHabitId(): string {
  try { const id = globalThis.crypto?.randomUUID?.(); if (id) return id; } catch { /* ID lokal bukan token keamanan. */ }
  return `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Field target/unit/sleepTarget tetap menjadi target awal, bukan cache target terbaru.
function initialTarget(habit: Habit): TargetRevision {
  return { from: habit.scheduleHistory.map((item) => item.from).sort()[0] ?? '', target: habit.target, unit: habit.unit, ...(habit.sleepTarget ? { sleepTarget: { ...habit.sleepTarget } } : {}) };
}
function validTarget(value: unknown, habit: Habit, baseline = false): value is TargetValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const kind = habitCatalog.find((item) => item.id === habit.templateId)?.inputKind;
  if (kind === 'quantity') return v['unit'] === habit.unit && v['sleepTarget'] === undefined &&
    ((baseline && v['target'] === null) || (typeof v['target'] === 'number' && Number.isFinite(v['target']) && v['target'] > 0));
  return kind === 'time' && v['target'] === null && v['unit'] === null &&
    ((baseline && v['sleepTarget'] === undefined) || isSleepTarget(v['sleepTarget']));
}
function sameTarget(a: TargetValue, b: TargetValue): boolean {
  return a.target === b.target && a.unit === b.unit && a.sleepTarget?.event === b.sleepTarget?.event &&
    a.sleepTarget?.time === b.sleepTarget?.time && a.sleepTarget?.toleranceMinutes === b.sleepTarget?.toleranceMinutes;
}
export function parseTargetHistory(value: unknown, habit: Habit): TargetRevision[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const history: TargetRevision[] = []; const initial = initialTarget(habit);
  for (const [index, item] of value.entries()) {
    if (typeof item !== 'object' || item === null) return null;
    const v = item as Record<string, unknown>;
    if (!isDateKey(v['from']) || !validTarget(v, habit, index === 0)) return null;
    const previous = history[history.length - 1];
    if (previous && v['from'] <= previous.from) return null;
    const revision: TargetRevision = { from: v['from'], target: v.target, unit: v.unit, ...(v.sleepTarget ? { sleepTarget: { ...v.sleepTarget } } : {}) };
    if (index === 0 && (revision.from !== initial.from || !sameTarget(revision, initial))) return null;
    history.push(revision);
  }
  return history;
}
export function targetTimeline(habit: Habit): TargetRevision[] {
  return habit.targetHistory ?? [initialTarget(habit)];
}
export function habitAtDate(habit: Habit, date: string): Habit {
  let goal = initialTarget(habit);
  for (const revision of targetTimeline(habit)) if (revision.from <= date && revision.from >= goal.from) goal = revision;
  const effective = { ...habit, target: goal.target, unit: goal.unit };
  if (goal.sleepTarget) effective.sleepTarget = { ...goal.sleepTarget }; else delete effective.sleepTarget;
  return effective;
}
export function describeHabitTarget(value: TargetValue): string {
  if (value.sleepTarget) return `${value.sleepTarget.event === 'wake' ? 'Bangun' : 'Mulai tidur'} ${value.sleepTarget.time}, toleransi ±${value.sleepTarget.toleranceMinutes} menit`;
  return value.target === null ? 'Satu tindakan atau catatan bermakna' : `${value.target} ${value.unit ?? ''}`.trim();
}
export type TargetChange = { ok: true; data: HabitData } | { ok: false; reason: 'invalid-input' | 'past-date' | 'existing-entry' };
export function reviseHabitTarget(data: HabitData, habitId: string, from: string, goal: TargetValue, today: string, updatedAt = new Date().toISOString()): TargetChange {
  const habit = data.habits.find((item) => item.id === habitId);
  if (!habit || habit.status !== 'active' || !isDateKey(today) || !isDateKey(from) || !validTarget(goal, habit) || !Number.isFinite(Date.parse(updatedAt))) return { ok: false, reason: 'invalid-input' };
  if (from <= today || from <= initialTarget(habit).from) return { ok: false, reason: 'past-date' };
  if (data.entries.some((entry) => entry.habitId === habitId && entry.date >= from)) return { ok: false, reason: 'existing-entry' };
  const history = [...targetTimeline(habit).filter((revision) => revision.from !== from), { from, target: goal.target, unit: goal.unit, ...(goal.sleepTarget ? { sleepTarget: { ...goal.sleepTarget } } : {}) }].sort((a, b) => a.from.localeCompare(b.from));
  if (!parseTargetHistory(history, habit)) return { ok: false, reason: 'invalid-input' };
  return { ok: true, data: { ...data, habits: data.habits.map((item) => item.id === habitId ? { ...item, targetHistory: history, updatedAt } : item) } };
}
