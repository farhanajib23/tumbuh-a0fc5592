import { dailyPresets, componentProgress, type DailyPreset } from './habit-daily-presets';
import { createHabitId, type HabitData, type HabitEntry } from './habit-model';
import type { HabitCategoryId } from './habit-catalog';

export interface DailyRecord {
  components?: Record<string, number>;
  onTime?: Record<string, boolean>;
  duration?: number; title?: string; source?: string; learning?: string; pages?: number;
}
declare module './habit-model' { interface HabitEntry { daily?: DailyRecord } }
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export function isDailyRecord(value: unknown): value is DailyRecord {
  if (!record(value)) return false;
  if (Object.keys(value).some((key) => !['components', 'onTime', 'duration', 'title', 'source', 'learning', 'pages'].includes(key))) return false;
  for (const key of ['components', 'onTime']) {
    const field = value[key];
    if (field !== undefined && (!record(field) || Object.keys(field).length > 20 || Object.values(field).some((item) => key === 'onTime' ? typeof item !== 'boolean' : typeof item !== 'number' || !Number.isFinite(item) || item < 0))) return false;
  }
  for (const key of ['duration', 'pages']) { const field = value[key]; if (field !== undefined && (typeof field !== 'number' || !Number.isFinite(field) || field < 0)) return false; }
  for (const key of ['title', 'source', 'learning']) { const field = value[key]; if (field !== undefined && (typeof field !== 'string' || field.length > 2000)) return false; }
  return true;
}
export function dailyPreset(id: string | null | undefined): DailyPreset | undefined { return dailyPresets.find((item) => item.id === id); }
export function dailyInputKind(id: string | null | undefined) {
  const kind = dailyPreset(id)?.kind;
  return kind === 'checklist' || kind === 'components' ? 'binary' : kind;
}
export function validDailyEntry(entry: HabitEntry, preset: DailyPreset | undefined): boolean {
  if (!preset) return entry.daily === undefined;
  if (entry.daily !== undefined && !isDailyRecord(entry.daily)) return false;
  if (preset.kind !== 'components') return !entry.daily?.components && !entry.daily?.onTime;
  const components = preset.components ?? []; const values = entry.daily?.components;
  if (!values || entry.value !== null || entry.detail !== undefined || Object.keys(values).length === 0) return false;
  const ids = components.map((item) => item.id);
  if (Object.keys(values).some((id) => !ids.includes(id))) return false;
  if (entry.daily?.onTime && (preset.id !== 'daily-prayer' || Object.keys(entry.daily.onTime).some((id) => !ids.includes(id)))) return false;
  const complete = componentProgress(components, values) === 'complete' && (preset.id !== 'daily-prayer' || ids.every((id) => entry.daily?.onTime?.[id] === true));
  return entry.done === complete;
}
export function addDailyHabits(data: HabitData, from: string, now = new Date().toISOString()): HabitData {
  const categories: Record<string, HabitCategoryId> = { 'daily-wake-0430': 'health', 'daily-water': 'health', 'daily-workout': 'health', 'daily-meditation': 'awareness', 'daily-prayer': 'awareness', 'daily-learning-content': 'learning', 'daily-journaling-session': 'awareness', 'daily-walking': 'health', 'daily-reading-30': 'learning', 'daily-social-detox': 'focus', 'daily-make-bed': 'focus' };
  const additions = dailyPresets.filter((preset) => !data.habits.some((habit) => habit.templateId === preset.id)).map((preset) => ({
    id: createHabitId(), templateId: preset.id, name: preset.name, categoryId: categories[preset.id] ?? 'focus', purpose: preset.description,
    target: preset.kind === 'quantity' ? preset.target : null, unit: preset.kind === 'quantity' ? preset.unit : null, status: 'active' as const, inactiveFrom: null,
    scheduleHistory: [{ from, schedule: { kind: 'daily' as const } }], reminderTime: null, createdAt: now, updatedAt: now,
    ...(preset.kind === 'time' ? { sleepTarget: { event: 'wake' as const, time: preset.targetTime ?? '04:30', toleranceMinutes: 0 } } : {}),
  }));
  return { ...data, habits: [...data.habits, ...additions] };
}
