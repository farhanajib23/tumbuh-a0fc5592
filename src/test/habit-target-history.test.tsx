import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HabitWorkspace } from "@/components/tumbuh/habit-workspace";
import {
  habitAtDate,
  matchesSleepTarget,
  reviseHabitTarget,
  type HabitData,
  type TargetChange,
} from "@/lib/habit-model";
import { HABIT_STORAGE_KEY, LEGACY_HABIT_STORAGE_KEY, loadHabitData } from "@/lib/habit-storage";
import { commitHabitData, readHabitSnapshot } from "@/lib/habit-transactions";

function fixture(): HabitData {
  return {
    version: 2,
    habits: [
      {
        id: "h1",
        templateId: "reading",
        name: "Membaca",
        categoryId: "learning",
        purpose: "",
        target: 15,
        unit: "menit",
        status: "active",
        inactiveFrom: null,
        scheduleHistory: [{ from: "2026-10-01", schedule: { kind: "daily" } }],
        reminderTime: null,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    ],
    entries: [
      {
        habitId: "h1",
        date: "2026-10-18",
        done: true,
        value: 20,
        note: null,
        reflection: null,
        updatedAt: "2026-10-18T01:00:00Z",
      },
    ],
  };
}
function success(result: TargetChange): HabitData {
  if (!result.ok) throw new Error(result.reason);
  return result.data;
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
const goal = { target: 30, unit: "menit" };
beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Riwayat target habit", () => {
  it("membaca data lama tanpa migrasi dan memakai target awal", () => {
    const data = fixture();
    const storage = memory();
    storage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data));
    expect(loadHabitData(storage).status).toBe("ok");
    expect(habitAtDate(data.habits[0]!, "2026-10-18").target).toBe(15);
    expect(data.habits[0]?.targetHistory).toBeUndefined();
  });
  it("menjaga target awal, entri, dan data asal saat target baru dijadwalkan", () => {
    const data = fixture();
    const next = success(reviseHabitTarget(data, "h1", "2026-10-19", goal, "2026-10-18"));
    expect(next.entries).toBe(data.entries);
    expect(next.entries[0]?.done).toBe(true);
    expect(data.habits[0]?.targetHistory).toBeUndefined();
    expect(next.habits[0]?.target).toBe(15);
    expect(habitAtDate(next.habits[0]!, "2026-10-18").target).toBe(15);
    expect(habitAtDate(next.habits[0]!, "2026-10-19").target).toBe(30);
  });
  it("mengurutkan beberapa rencana dan mengganti tanggal rencana yang sama tanpa duplikasi", () => {
    let data = success(
      reviseHabitTarget(fixture(), "h1", "2026-10-25", { target: 45, unit: "menit" }, "2026-10-18"),
    );
    data = success(reviseHabitTarget(data, "h1", "2026-10-19", goal, "2026-10-18"));
    data = success(
      reviseHabitTarget(data, "h1", "2026-10-19", { target: 25, unit: "menit" }, "2026-10-18"),
    );
    expect(data.habits[0]?.targetHistory).toHaveLength(3);
    expect(habitAtDate(data.habits[0]!, "2026-10-20").target).toBe(25);
    expect(habitAtDate(data.habits[0]!, "2026-10-25").target).toBe(45);
  });
  it("menolak perubahan mundur, target tidak valid, dan periode yang sudah memiliki catatan", () => {
    expect(reviseHabitTarget(fixture(), "h1", "2026-10-18", goal, "2026-10-18")).toEqual({
      ok: false,
      reason: "past-date",
    });
    for (const target of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(
        reviseHabitTarget(fixture(), "h1", "2026-10-19", { target, unit: "menit" }, "2026-10-18")
          .ok,
      ).toBe(false);
    const data = fixture();
    data.entries.push({ ...data.entries[0]!, date: "2026-10-20" });
    expect(reviseHabitTarget(data, "h1", "2026-10-19", goal, "2026-10-18")).toEqual({
      ok: false,
      reason: "existing-entry",
    });
  });
  it("memakai target waktu dan toleransi sesuai tanggal, termasuk sekitar tengah malam", () => {
    const data = fixture();
    data.entries = [];
    Object.assign(data.habits[0]!, {
      templateId: "consistent-sleep",
      name: "Tidur Konsisten",
      categoryId: "health",
      target: null,
      unit: null,
      sleepTarget: { event: "bedtime", time: "22:00", toleranceMinutes: 30 },
    });
    const next = success(
      reviseHabitTarget(
        data,
        "h1",
        "2026-10-19",
        {
          target: null,
          unit: null,
          sleepTarget: { event: "bedtime", time: "00:10", toleranceMinutes: 10 },
        },
        "2026-10-18",
      ),
    );
    expect(
      matchesSleepTarget("00:05", habitAtDate(next.habits[0]!, "2026-10-18").sleepTarget!),
    ).toBe(false);
    expect(
      matchesSleepTarget("00:05", habitAtDate(next.habits[0]!, "2026-10-19").sleepTarget!),
    ).toBe(true);
  });
  it("menyimpan riwayat utuh tanpa menyentuh v1 dan mencadangkan riwayat yang rusak", () => {
    const data = success(reviseHabitTarget(fixture(), "h1", "2026-10-19", goal, "2026-10-18"));
    const storage = memory();
    storage.setItem(LEGACY_HABIT_STORAGE_KEY, "v1 tetap");
    expect(commitHabitData(storage, readHabitSnapshot(storage), data).ok).toBe(true);
    expect(loadHabitData(storage).data).toEqual(data);
    expect(storage.getItem(LEGACY_HABIT_STORAGE_KEY)).toBe("v1 tetap");
    data.habits[0]!.targetHistory!.push({ from: "2026-10-19", target: 40, unit: "menit" });
    const raw = JSON.stringify(data);
    storage.setItem(HABIT_STORAGE_KEY, raw);
    const loaded = loadHabitData(storage);
    expect(loaded.status).toBe("recovered");
    expect(loaded.backedUp).toBe(true);
    expect(storage.getItem(HABIT_STORAGE_KEY)).toBe(raw);
  });
  it("tidak menimpa konflik snapshot atau menyatakan sukses saat kuota habis", () => {
    const storage = memory();
    const data = fixture();
    storage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data));
    const snapshot = readHabitSnapshot(storage);
    const next = success(reviseHabitTarget(data, "h1", "2026-10-19", goal, "2026-10-18"));
    const quota = {
      getItem: storage.getItem,
      setItem: () => {
        throw Object.assign(new Error("Penuh"), { name: "QuotaExceededError" });
      },
    };
    expect(commitHabitData(quota, snapshot, next)).toEqual({ ok: false, reason: "quota" });
    const newer = JSON.stringify({ ...data, entries: [] });
    storage.setItem(HABIT_STORAGE_KEY, newer);
    expect(commitHabitData(storage, snapshot, next)).toEqual({ ok: false, reason: "conflict" });
    expect(storage.getItem(HABIT_STORAGE_KEY)).toBe(newer);
  });
  it("menghubungkan form, muat ulang, pencatatan setelah target berlaku, dan navigasi tanggal lama", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 18, 12));
    window.localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(fixture()));
    render(<HabitWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Ubah target Membaca" }));
    fireEvent.change(screen.getByLabelText("Target baru Membaca"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Jadwalkan target Membaca" }));
    expect(screen.getByText(/Target pada tanggal dipilih: 15 menit/)).toBeInTheDocument();
    expect(loadHabitData(window.localStorage).data.habits[0]?.targetHistory).toHaveLength(2);
    cleanup();
    vi.setSystemTime(new Date(2026, 9, 19, 12));
    render(<HabitWorkspace />);
    expect(await screen.findByText(/Target pada tanggal dipilih: 30 menit/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nilai aktual Membaca"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Membaca" }));
    const entries = loadHabitData(window.localStorage).data.entries;
    expect(entries.find((entry) => entry.date === "2026-10-18")?.done).toBe(true);
    expect(entries.find((entry) => entry.date === "2026-10-19")?.done).toBe(false);
    fireEvent.change(screen.getByLabelText("Tanggal pencatatan"), {
      target: { value: "2026-10-18" },
    });
    expect(screen.getByText(/Target pada tanggal dipilih: 15 menit/)).toBeInTheDocument();
  });
});
