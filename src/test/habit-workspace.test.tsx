import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HabitWorkspace } from "@/components/tumbuh/habit-workspace";
import { HABIT_STORAGE_KEY, LEGACY_HABIT_STORAGE_KEY } from "@/lib/habit-storage";
import type { HabitData } from "@/lib/habit-model";

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function chooseReading() {
  render(<HabitWorkspace />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Pilih Membaca" }));
  fireEvent.click(screen.getByRole("button", { name: "Aktifkan 1 kebiasaan" }));
}

describe("Workspace habit", () => {
  it("mengaktifkan habit, menyimpan pengukuran, memuat ulang, dan membatalkan catatan", async () => {
    await chooseReading();
    fireEvent.change(await screen.findByLabelText("Nilai aktual Membaca"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Membaca" }));
    await waitFor(() => {
      const data = JSON.parse(window.localStorage.getItem(HABIT_STORAGE_KEY) ?? "null") as HabitData;
      expect(data.entries[0]?.value).toBe(15);
      expect(data.entries[0]?.done).toBe(true);
    });
    cleanup();
    render(<HabitWorkspace />);
    expect(await screen.findByRole("button", { name: "Batalkan catatan Membaca" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Batalkan catatan Membaca" }));
    const data = JSON.parse(window.localStorage.getItem(HABIT_STORAGE_KEY) ?? "null") as HabitData;
    expect(data.entries).toHaveLength(0);
  });

  it("menampilkan kegagalan simpan tanpa menambahkan habit ke state", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Object.assign(new Error("Penuh"), { name: "QuotaExceededError" }); });
    await chooseReading();
    expect(await screen.findByRole("alert")).toHaveTextContent("Penyimpanan penuh");
    expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBeNull();
    expect(screen.queryByLabelText("Nilai aktual Membaca")).not.toBeInTheDocument();
  });

  it("menjaga data v1 dan menandai input khusus belum tersedia", async () => {
    window.localStorage.setItem(LEGACY_HABIT_STORAGE_KEY, "data lama jangan diubah");
    render(<HabitWorkspace />);
    expect(await screen.findByRole("checkbox", { name: "Pilih Jurnal Harian" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Pilih Check-in Emosi" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Pilih Tidur Konsisten" })).toBeDisabled();
    expect(window.localStorage.getItem(LEGACY_HABIT_STORAGE_KEY)).toBe("data lama jangan diubah");
  });
});
