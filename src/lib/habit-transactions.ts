import type { HabitData, HabitEntry } from "./habit-model";
import { isDateKey, isScheduledOn } from "./habit-metrics";
import {
  HABIT_STORAGE_KEY,
  isSaveSafe,
  loadHabitData,
  saveHabitData,
  type LoadResult,
  type StorageLike,
} from "./habit-storage";

export interface HabitSnapshot {
  raw: string | null;
  loaded: LoadResult;
}

export type ChangeResult =
  | { ok: true; data: HabitData }
  | { ok: false; reason: "invalid-input" | "not-scheduled" };

export type CommitResult =
  | { ok: true; snapshot: HabitSnapshot }
  | {
      ok: false;
      reason: "unavailable" | "recovery-required" | "conflict" | "invalid-data" | "quota" | "unknown";
    };

// Snapshot dibaca sekali. Loader memeriksa snapshot yang sama, bukan pembacaan kedua.
export function readHabitSnapshot(storage: StorageLike | null): HabitSnapshot {
  if (!storage) return { raw: null, loaded: loadHabitData(null) };
  try {
    const raw = storage.getItem(HABIT_STORAGE_KEY);
    const loaded = loadHabitData({
      getItem: () => raw,
      setItem: (key, value) => storage.setItem(key, value),
    });
    return { raw, loaded };
  } catch {
    return { raw: null, loaded: loadHabitData(null) };
  }
}

export function recordHabitEntry(
  data: HabitData,
  entry: HabitEntry,
  today: string,
): ChangeResult {
  if (!isDateKey(today) || !isDateKey(entry.date) || entry.date > today) {
    return { ok: false, reason: "invalid-input" };
  }
  if (entry.value !== null && (!Number.isFinite(entry.value) || entry.value < 0)) {
    return { ok: false, reason: "invalid-input" };
  }
  if (!Number.isFinite(Date.parse(entry.updatedAt))) {
    return { ok: false, reason: "invalid-input" };
  }
  const habit = data.habits.find((item) => item.id === entry.habitId);
  if (!habit) return { ok: false, reason: "invalid-input" };
  if (!isScheduledOn(habit, entry.date)) return { ok: false, reason: "not-scheduled" };
  const normalized = { ...entry, note: entry.note?.trim() || null };
  return {
    ok: true,
    data: {
      ...data,
      entries: [
        ...data.entries.filter((item) =>
          !(item.habitId === entry.habitId && item.date === entry.date)),
        normalized,
      ],
    },
  };
}

// Undo menghapus catatan tanggal itu, bukan menulis done:false.
export function undoHabitEntry(data: HabitData, habitId: string, date: string): ChangeResult {
  if (!isDateKey(date) || !data.habits.some((habit) => habit.id === habitId)) {
    return { ok: false, reason: "invalid-input" };
  }
  return {
    ok: true,
    data: {
      ...data,
      entries: data.entries.filter((entry) => !(entry.habitId === habitId && entry.date === date)),
    },
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

// Pemanggil baru memperbarui state/menampilkan sukses setelah ok:true.
// Pengecekan snapshot mengurangi konflik, tetapi localStorage bukan transaksi antar-tab atomik.
export function commitHabitData(
  storage: StorageLike | null,
  expected: HabitSnapshot,
  next: HabitData,
): CommitResult {
  if (!storage || expected.loaded.status === "unavailable") {
    return { ok: false, reason: "unavailable" };
  }
  if (!isSaveSafe(expected.loaded) ||
      expected.loaded.status === "recovered" || expected.loaded.status === "unreadable") {
    return { ok: false, reason: "recovery-required" };
  }
  let raw: string;
  let validated: LoadResult;
  try {
    raw = JSON.stringify(next);
    validated = loadHabitData({
      getItem: () => raw,
      setItem: () => { throw new Error("Validasi tidak menulis cadangan"); },
    });
    if (validated.status !== "ok" || canonical(validated.data) !== canonical(next)) {
      return { ok: false, reason: "invalid-data" };
    }
  } catch {
    return { ok: false, reason: "invalid-data" };
  }
  try {
    if (storage.getItem(HABIT_STORAGE_KEY) !== expected.raw) {
      return { ok: false, reason: "conflict" };
    }
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  const saved = saveHabitData(storage, next);
  if (!saved.ok) return saved;
  return { ok: true, snapshot: { raw, loaded: validated } };
}
