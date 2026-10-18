import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HabitWorkspace } from "@/components/tumbuh/habit-workspace";
import { createHabitId, matchesSleepTarget, type HabitData } from "@/lib/habit-model";
import { HABIT_STORAGE_KEY, LEGACY_HABIT_STORAGE_KEY, loadHabitData } from "@/lib/habit-storage";

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const saved = () =>
  JSON.parse(window.localStorage.getItem(HABIT_STORAGE_KEY) ?? "null") as HabitData;
async function activate(names: string[]) {
  render(<HabitWorkspace />);
  for (const name of names)
    fireEvent.click(await screen.findByRole("checkbox", { name: `Pilih ${name}` }));
  fireEvent.click(screen.getByRole("button", { name: `Aktifkan ${names.length} kebiasaan` }));
}

describe("Workspace habit", () => {
  it("menyimpan pengukuran, memuat ulang, dan membatalkan catatan", async () => {
    await activate(["Membaca"]);
    fireEvent.change(await screen.findByLabelText("Nilai aktual Membaca"), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Membaca" }));
    expect(saved().entries[0]?.value).toBe(15);
    expect(saved().entries[0]?.done).toBe(true);
    cleanup();
    render(<HabitWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Batalkan catatan Membaca" }));
    expect(saved().entries).toHaveLength(0);
  });
  it("tidak menampilkan sukses ketika penyimpanan penuh", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw Object.assign(new Error("Penuh"), { name: "QuotaExceededError" });
    });
    await activate(["Membaca"]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Penyimpanan penuh");
    expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBeNull();
    expect(screen.queryByLabelText("Nilai aktual Membaca")).not.toBeInTheDocument();
  });
  it("menyimpan dan memuat ulang tiga jenis input khusus tanpa mengubah v1", async () => {
    window.localStorage.setItem(LEGACY_HABIT_STORAGE_KEY, "data lama jangan diubah");
    await activate(["Jurnal Harian", "Check-in Emosi", "Tidur Konsisten"]);
    fireEvent.change(await screen.findByLabelText("Isi jurnal Jurnal Harian"), {
      target: { value: "Hari ini aku belajar beristirahat." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Jurnal Harian" }));
    fireEvent.change(screen.getByLabelText("Suasana hati Check-in Emosi"), {
      target: { value: "sangat-tidak-nyaman" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Check-in Emosi" }));
    fireEvent.change(screen.getByLabelText("Waktu aktual Tidur Konsisten"), {
      target: { value: "22:15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Tidur Konsisten" }));
    expect(saved().entries).toHaveLength(3);
    expect(saved().entries.every((entry) => entry.done)).toBe(true);
    expect(loadHabitData(window.localStorage).status).toBe("ok");
    cleanup();
    render(<HabitWorkspace />);
    expect(await screen.findByLabelText("Isi jurnal Jurnal Harian")).toHaveValue(
      "Hari ini aku belajar beristirahat.",
    );
    expect(screen.getByLabelText("Suasana hati Check-in Emosi")).toHaveValue("sangat-tidak-nyaman");
    expect(screen.getByLabelText("Waktu aktual Tidur Konsisten")).toHaveValue("22:15");
    expect(window.localStorage.getItem(LEGACY_HABIT_STORAGE_KEY)).toBe("data lama jangan diubah");
  });
  it("menghitung toleransi waktu melintasi tengah malam", () => {
    const target = { event: "bedtime" as const, time: "23:55", toleranceMinutes: 20 };
    expect(matchesSleepTarget("00:10", target)).toBe(true);
    expect(matchesSleepTarget("00:30", target)).toBe(false);
  });
  it("menyediakan fallback ID lokal tanpa randomUUID", () => {
    vi.stubGlobal("crypto", {});
    expect(createHabitId()).toMatch(/^habit-/);
  });
  it("mencadangkan normalisasi dan menolak menimpa field yang belum dikenali", async () => {
    await activate(["Membaca"]);
    cleanup();
    const raw = JSON.stringify({ ...saved(), futureField: "jangan hilangkan" });
    window.localStorage.setItem(HABIT_STORAGE_KEY, raw);
    const loaded = loadHabitData(window.localStorage);
    expect(loaded.status).toBe("recovered");
    expect(loaded.backedUp).toBe(true);
    render(<HabitWorkspace />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Penulisan diblokir");
    expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBe(raw);
  });
});
