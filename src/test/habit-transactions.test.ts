import { describe, expect, it } from "vitest";
import type { HabitData, HabitEntry } from "@/lib/habit-model";
import { HABIT_STORAGE_KEY, LEGACY_HABIT_STORAGE_KEY } from "@/lib/habit-storage";
import {
  commitHabitData,
  readHabitSnapshot,
  recordHabitEntry,
  undoHabitEntry,
} from "@/lib/habit-transactions";

function fixture(): HabitData {
  return {
    version: 2,
    habits: [
      {
        id: "h1",
        templateId: "reading",
        name: "Membaca",
        categoryId: "learning",
        purpose: "Belajar",
        unit: "menit",
        target: 15,
        status: "active",
        inactiveFrom: null,
        scheduleHistory: [{ from: "2026-10-01", schedule: { kind: "daily" } }],
        reminderTime: null,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    ],
    entries: [],
  };
}

function entry(patch: Partial<HabitEntry> = {}): HabitEntry {
  return {
    habitId: "h1",
    date: "2026-10-18",
    done: true,
    value: null,
    note: null,
    reflection: null,
    updatedAt: "2026-10-18T05:00:00Z",
    ...patch,
  };
}

function memory() {
  const records = new Map<string, string>();
  return {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
}

describe("Transaksi habit", () => {
  it("mencatat biner tanpa memutasi data asal", () => {
    const data = fixture();
    const result = recordHabitEntry(data, entry(), "2026-10-18");
    expect(result.ok).toBe(true);
    expect(data.entries).toHaveLength(0);
    if (result.ok) expect(result.data.entries[0]?.done).toBe(true);
  });

  it("menyimpan pengukuran dan mengganti entri hari yang sama tanpa duplikasi", () => {
    const data = fixture();
    data.entries.push(entry({ value: 5 }));
    const result = recordHabitEntry(data, entry({ value: 20 }), "2026-10-18");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.entries).toHaveLength(1);
      expect(result.data.entries[0]?.value).toBe(20);
    }
  });

  it("menolak angka tidak valid dan tanggal masa depan", () => {
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(recordHabitEntry(fixture(), entry({ value }), "2026-10-18").ok).toBe(false);
    }
    expect(recordHabitEntry(fixture(), entry({ date: "2026-10-19" }), "2026-10-18").ok).toBe(false);
  });

  it("menolak hari tidak terjadwal termasuk habit dijeda pada tanggal itu", () => {
    const data = fixture();
    const habit = data.habits[0];
    if (!habit) throw new Error("Fixture habit tidak ditemukan");
    habit.status = "paused";
    habit.inactiveFrom = "2026-10-18";
    expect(recordHabitEntry(data, entry(), "2026-10-18")).toEqual({
      ok: false,
      reason: "not-scheduled",
    });
  });

  it("membedakan tidak dilakukan dari belum dicatat dan mendukung undo", () => {
    const result = recordHabitEntry(fixture(), entry({ done: false }), "2026-10-18");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.entries[0]?.done).toBe(false);
    const undone = undoHabitEntry(result.data, "h1", "2026-10-18");
    expect(undone.ok).toBe(true);
    if (undone.ok) expect(undone.data.entries).toHaveLength(0);
  });

  it("menyimpan snapshot baru dan tidak menyentuh data v1", () => {
    const storage = memory();
    storage.setItem(LEGACY_HABIT_STORAGE_KEY, "data lama");
    const result = commitHabitData(storage, readHabitSnapshot(storage), fixture());
    expect(result.ok).toBe(true);
    expect(readHabitSnapshot(storage).loaded.data).toEqual(fixture());
    expect(storage.getItem(LEGACY_HABIT_STORAGE_KEY)).toBe("data lama");
  });

  it("menolak snapshot usang tanpa menimpa perubahan lain", () => {
    const storage = memory();
    const snapshot = readHabitSnapshot(storage);
    const newer = JSON.stringify(fixture());
    storage.setItem(HABIT_STORAGE_KEY, newer);
    expect(commitHabitData(storage, snapshot, fixture())).toEqual({
      ok: false,
      reason: "conflict",
    });
    expect(storage.getItem(HABIT_STORAGE_KEY)).toBe(newer);
  });

  it("tidak mengembalikan sukses saat kuota penyimpanan habis", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw Object.assign(new Error("Penuh"), { name: "QuotaExceededError" });
      },
    };
    expect(commitHabitData(storage, readHabitSnapshot(storage), fixture())).toEqual({
      ok: false,
      reason: "quota",
    });
    expect(storage.getItem()).toBeNull();
  });

  it("memblokir pemulihan otomatis dan payload tidak valid", () => {
    const storage = memory();
    storage.setItem(HABIT_STORAGE_KEY, "{rusak");
    const snapshot = readHabitSnapshot(storage);
    expect(commitHabitData(storage, snapshot, fixture())).toEqual({
      ok: false,
      reason: "recovery-required",
    });
    expect(storage.getItem(HABIT_STORAGE_KEY)).toBe("{rusak");
    const fresh = memory();
    const invalid = fixture();
    invalid.entries.push(entry({ value: -1 }));
    expect(commitHabitData(fresh, readHabitSnapshot(fresh), invalid)).toEqual({
      ok: false,
      reason: "invalid-data",
    });
    expect(fresh.getItem(HABIT_STORAGE_KEY)).toBeNull();
  });
});
