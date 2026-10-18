import type { HabitCategoryId } from './habit-catalog';

export type HabitStatus = 'active' | 'paused' | 'archived';
export type HabitReflection = 'membantu' | 'biasa' | 'tidak-cocok';
export type Schedule = { kind: 'daily' } | { kind: 'days'; days: number[] };
export interface ScheduleEntry { from: string; schedule: Schedule }
export interface SleepTarget { event: 'bedtime' | 'wake'; time: string; toleranceMinutes: number }
export const moodChoices = ['sangat-tidak-nyaman', 'tidak-nyaman', 'netral', 'nyaman', 'sangat-nyaman'] as const;
export type EntryDetail =
  | { kind: 'journal'; text: string }
  | { kind: 'mood'; mood: typeof moodChoices[number]; context: string | null }
  | { kind: 'time'; event: 'bedtime' | 'wake'; time: string };

export interface Habit {
  id: string; templateId: string | null; name: string; categoryId: HabitCategoryId;
  purpose: string; unit: string | null; target: number | null; status: HabitStatus;
  inactiveFrom: string | null; scheduleHistory: ScheduleEntry[]; reminderTime: string | null;
  createdAt: string; updatedAt: string; sleepTarget?: SleepTarget;
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
  const actual = clockMinutes(time);
  const goal = clockMinutes(target.time);
  if (actual === null || goal === null || !isSleepTarget(target)) return false;
  const difference = Math.abs(actual - goal);
  return Math.min(difference, 1440 - difference) <= target.toleranceMinutes;
}
export function createHabitId(): string {
  try { const id = globalThis.crypto?.randomUUID?.(); if (id) return id; } catch { /* ID lokal bukan token keamanan. */ }
  return `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
