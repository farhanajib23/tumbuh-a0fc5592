import { describe, expect, it } from "vitest";
import { emptyHabitData, type HabitData } from "@/lib/habit-model";
import {
  HABIT_STORAGE_KEY,
  LEGACY_HABIT_STORAGE_KEY,
  isSaveSafe,
  loadHabitData,
  saveHabitData,
} from "@/lib/habit-storage";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  keys(): string[] {
    return [...this.store.keys()];
  }
}

const validHabit = {
  id: "h1",
  templateId: "reading",
  name: "Membaca",
  categoryId: "learning",
  purpose: "Menambah wawasan",
  unit: "menit",
  target: 15,
  status: "active",
  inactiveFrom: null,
  scheduleHistory: [{ from: "2026-10-01", schedule: { kind: "daily" } }],
  reminderTime: "07:30",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};
const validEntry = {
  habitId: "h1",
  date: "2026-10-17",
  done: true,
  value: 20,
  note: null,
  reflection: "membantu",
  updatedAt: "",
};

describe("Penyimpanan habit v2", () => {
  it("mengembalikan data kosong bila belum ada", () => {
    const result = loadHabitData(new MemoryStorage());
    expect(result.status).toBe("empty");
    expect(result.data).toEqual(emptyHabitData());
  });

  it("menyimpan lalu membaca ulang tanpa perubahan", () => {
    const storage = new MemoryStorage();
    const data = JSON.parse(
      JSON.stringify({ version: 2, habits: [validHabit], entries: [validEntry] }),
    ) as HabitData;
    expect(saveHabitData(storage, data)).toEqual({ ok: true });
    const result = loadHabitData(storage);
    expect(result.status).toBe("ok");
    expect(result.data.habits).toHaveLength(1);
    expect(result.data.entries[0]?.value).toBe(20);
  });

  it("tidak menyentuh kunci rutinitas lama v1", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_HABIT_STORAGE_KEY, '{"routines":[],"checkins":[]}');
    saveHabitData(storage, emptyHabitData());
    expect(storage.getItem(LEGACY_HABIT_STORAGE_KEY)).toBe('{"routines":[],"checkins":[]}');
  });

  it("mencadangkan JSON rusak dan tidak menyatakan aman tanpa cadangan", () => {
    const storage = new MemoryStorage();
    storage.setItem(HABIT_STORAGE_KEY, "{rusak");
    const result = loadHabitData(storage);
    expect(result.status).toBe("unreadable");
    expect(result.backedUp).toBe(true);
    expect(isSaveSafe(result)).toBe(true);
    expect(storage.getItem(HABIT_STORAGE_KEY)).toBe("{rusak");
    expect(storage.keys().some((k) => k.startsWith(`${HABIT_STORAGE_KEY}-backup-`))).toBe(true);
  });

  it("membuang item tidak valid, menghitungnya, dan mencadangkan data asli", () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({
      version: 2,
      habits: [validHabit, { id: "x" }],
      entries: [validEntry, { habitId: "h1", date: "bukan-tanggal", done: true }],
    });
    storage.setItem(HABIT_STORAGE_KEY, raw);
    const result = loadHabitData(storage);
    expect(result.status).toBe("recovered");
    expect(result.dropped).toBe(2);
    expect(result.backedUp).toBe(true);
    expect(result.data.habits).toHaveLength(1);
  });

  it("menggabungkan entri ganda untuk habit dan tanggal yang sama", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      HABIT_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        habits: [validHabit],
        entries: [validEntry, { ...validEntry, value: 25 }],
      }),
    );
    const result = loadHabitData(storage);
    expect(result.data.entries).toHaveLength(1);
    expect(result.data.entries[0]?.value).toBe(25);
  });

  it("habit nonaktif tanpa tanggal valid dianggap tidak terjadwal", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      HABIT_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        habits: [{ ...validHabit, status: "archived", inactiveFrom: "rusak" }],
        entries: [],
      }),
    );
    expect(loadHabitData(storage).data.habits[0]?.inactiveFrom).toBe("2026-10-01");
  });

  it("melaporkan kegagalan simpan, bukan sukses palsu", () => {
    const quota = {
      setItem: () => {
        throw Object.assign(new Error("penuh"), { name: "QuotaExceededError" });
      },
      getItem: () => null,
    };
    expect(saveHabitData(quota, emptyHabitData())).toEqual({ ok: false, reason: "quota" });
    expect(saveHabitData(null, emptyHabitData())).toEqual({ ok: false, reason: "unavailable" });
    expect(loadHabitData(null).status).toBe("unavailable");
  });
});
