import { describe, expect, it } from "vitest";
import { HABIT_STORAGE_KEY, isSaveSafe, loadHabitData } from "@/lib/habit-storage";

describe("Guard pemulihan data habit", () => {
  it("memblokir penulisan setelah pemulihan sebagian bila backup gagal", () => {
    const raw = JSON.stringify({ version: 2, habits: [{ id: "rusak" }], entries: [] });
    let writes = 0;
    const storage = {
      getItem: () => raw,
      setItem: () => {
        writes += 1;
        throw new Error("Penyimpanan penuh");
      },
    };
    const result = loadHabitData(storage);
    expect(result.status).toBe("recovered");
    expect(result.dropped).toBe(1);
    expect(result.backedUp).toBe(false);
    expect(isSaveSafe(result)).toBe(false);
    expect(writes).toBe(1);
    expect(storage.getItem()).toBe(raw);
  });

  it("mengizinkan pemulihan setelah backup mentah berhasil dan mempertahankan aslinya", () => {
    const raw = JSON.stringify({ version: 2, habits: [{ id: "rusak" }], entries: [] });
    const records = new Map<string, string>([[HABIT_STORAGE_KEY, raw]]);
    const storage = {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => {
        records.set(key, value);
      },
    };
    const result = loadHabitData(storage);
    expect(result.status).toBe("recovered");
    expect(result.backedUp).toBe(true);
    expect(isSaveSafe(result)).toBe(true);
    expect(records.get(HABIT_STORAGE_KEY)).toBe(raw);
    const backups = [...records.entries()].filter(([key]) =>
      key.startsWith(`${HABIT_STORAGE_KEY}-backup-`),
    );
    expect(backups).toHaveLength(1);
    expect(backups[0]?.[1]).toBe(raw);
  });

  it("memblokir storage tidak tersedia dan mengizinkan storage baru yang kosong", () => {
    expect(isSaveSafe(loadHabitData(null))).toBe(false);
    const storage = { getItem: () => null, setItem: () => undefined };
    expect(isSaveSafe(loadHabitData(storage))).toBe(true);
  });
});
