import { habitCatalog, habitCategories } from './habit-catalog';
import { dailyInputKind, dailyPreset, isDailyRecord, validDailyEntry } from './habit-daily-data';
import { isDateKey } from './habit-metrics';
import { emptyHabitData, isEntryDetail, isSleepTarget, parseTargetHistory, type Habit, type HabitData, type HabitEntry, type Schedule, type ScheduleEntry } from './habit-model';

export const HABIT_STORAGE_KEY = 'tumbuh-habit-v2';
export const LEGACY_HABIT_STORAGE_KEY = 'tumbuh-habit-v1';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadStatus = 'empty' | 'ok' | 'recovered' | 'unreadable' | 'unavailable';
export interface LoadResult { data: HabitData; status: LoadStatus; dropped: number; backedUp: boolean }
export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' | 'unknown' };
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): string | null => typeof v === 'string' && v.trim() !== '' ? v : null;

function parseSchedule(v: unknown): Schedule | null {
  if (!isRecord(v)) return null;
  if (v['kind'] === 'daily') return { kind: 'daily' };
  const days = v['days'];
  return v['kind'] === 'days' && Array.isArray(days) && days.length > 0 && days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    ? { kind: 'days', days: [...new Set(days as number[])] } : null;
}
function parseHistory(v: unknown): ScheduleEntry[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const history: ScheduleEntry[] = [];
  for (const item of v) {
    if (!isRecord(item) || !isDateKey(item['from'])) return null;
    const schedule = parseSchedule(item['schedule']);
    if (!schedule) return null;
    history.push({ from: item['from'], schedule });
  }
  return history;
}
function parseHabit(v: unknown): Habit | null {
  if (!isRecord(v)) return null;
  const id = text(v['id']); const name = text(v['name']);
  const category = habitCategories.find((c) => c.id === v['categoryId']);
  const history = parseHistory(v['scheduleHistory']); const status = v['status'];
  if (!id || !name || !category || !history || (status !== 'active' && status !== 'paused' && status !== 'archived')) return null;
  const sleepTarget = v['sleepTarget'];
  if (sleepTarget !== undefined && (!isSleepTarget(sleepTarget) || (v['templateId'] !== 'consistent-sleep' && v['templateId'] !== 'daily-wake-0430'))) return null;
  const target = v['target']; const reminder = v['reminderTime'];
  const habit: Habit = {
    id, templateId: text(v['templateId']), name, categoryId: category.id,
    purpose: typeof v['purpose'] === 'string' ? v['purpose'] : '', unit: text(v['unit']),
    target: typeof target === 'number' && Number.isFinite(target) && target > 0 ? target : null, status,
    inactiveFrom: status === 'active' ? null : isDateKey(v['inactiveFrom']) ? v['inactiveFrom'] : history.map((e) => e.from).sort()[0] ?? '0001-01-01',
    scheduleHistory: history, reminderTime: typeof reminder === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder) ? reminder : null,
    createdAt: text(v['createdAt']) ?? '', updatedAt: text(v['updatedAt']) ?? '',
    ...(isSleepTarget(sleepTarget) ? { sleepTarget } : {}),
  };
  if (v['targetHistory'] !== undefined) {
    const revisions = parseTargetHistory(v['targetHistory'], habit);
    if (!revisions) return null;
    habit.targetHistory = revisions;
  }
  return habit;
}
function parseEntry(v: unknown): HabitEntry | null {
  if (!isRecord(v)) return null;
  const habitId = text(v['habitId']); const value = v['value']; const reflection = v['reflection']; const detail = v['detail']; const daily = v['daily'];
  if (!habitId || !isDateKey(v['date']) || typeof v['done'] !== 'boolean' || (detail !== undefined && !isEntryDetail(detail)) || (daily !== undefined && !isDailyRecord(daily))) return null;
  return {
    habitId, date: v['date'], done: v['done'], value: typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null,
    note: text(v['note']), reflection: reflection === 'membantu' || reflection === 'biasa' || reflection === 'tidak-cocok' ? reflection : null,
    updatedAt: text(v['updatedAt']) ?? '', ...(isEntryDetail(detail) ? { detail } : {}), ...(isDailyRecord(daily) ? { daily } : {}),
  };
}
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (isRecord(v)) return `{${Object.keys(v).sort().map((key) => `${JSON.stringify(key)}:${canonical(v[key])}`).join(',')}}`;
  return JSON.stringify(v) ?? 'undefined';
}
let backupSequence = 0;
function backupRaw(storage: StorageLike, raw: string): boolean {
  try { storage.setItem(`${HABIT_STORAGE_KEY}-backup-${Date.now()}-${backupSequence++}`, raw); return true; } catch { return false; }
}
export function loadHabitData(storage: StorageLike | null): LoadResult {
  const fail = (status: LoadStatus, backedUp = false): LoadResult => ({ data: emptyHabitData(), status, dropped: 0, backedUp });
  if (!storage) return fail('unavailable');
  let raw: string | null;
  try { raw = storage.getItem(HABIT_STORAGE_KEY); } catch { return fail('unavailable'); }
  if (raw === null) return fail('empty');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return fail('unreadable', backupRaw(storage, raw)); }
  if (!isRecord(parsed) || parsed['version'] !== 2 || !Array.isArray(parsed['habits']) || !Array.isArray(parsed['entries'])) return fail('unreadable', backupRaw(storage, raw));
  const habits: Habit[] = []; const byKey = new Map<string, HabitEntry>(); let dropped = 0;
  for (const item of parsed['habits']) {
    const habit = parseHabit(item);
    if (habit && !habits.some((h) => h.id === habit.id)) habits.push(habit); else dropped += 1;
  }
  for (const item of parsed['entries']) {
    const entry = parseEntry(item);
    const habit = entry ? habits.find((h) => h.id === entry.habitId) : undefined;
    const preset = dailyPreset(habit?.templateId);
    const kind = dailyInputKind(habit?.templateId) ?? habitCatalog.find((t) => t.id === habit?.templateId)?.inputKind;
    const special = kind === 'journal' || kind === 'mood' || kind === 'time';
    if (!entry || !validDailyEntry(entry, preset) || (entry.detail && (!habit || entry.detail.kind !== kind || entry.value !== null)) || (special && entry.done && !entry.detail)) { dropped += 1; continue; }
    byKey.set(`${entry.habitId}|${entry.date}`, entry);
  }
  const data: HabitData = { version: 2, habits, entries: [...byKey.values()] };
  const changed = dropped > 0 || canonical(parsed) !== canonical(data);
  return { data, status: changed ? 'recovered' : 'ok', dropped, backedUp: changed ? backupRaw(storage, raw) : false };
}
export function isSaveSafe(result: LoadResult): boolean {
  if (result.status === 'unavailable') return false;
  return result.status === 'unreadable' || result.status === 'recovered' ? result.backedUp : true;
}
export function saveHabitData(storage: StorageLike | null, data: HabitData): SaveResult {
  if (!storage) return { ok: false, reason: 'unavailable' };
  try { storage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data)); return { ok: true }; } catch (error) {
    const name = typeof error === 'object' && error !== null && 'name' in error ? String((error as { name: unknown }).name) : '';
    return { ok: false, reason: name === 'QuotaExceededError' ? 'quota' : 'unknown' };
  }
}
