import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HabitHistory, HabitStatistics } from "@/components/tumbuh/habit-explore";
import {
  dateRange,
  historyRows,
  monthCells,
  parseHabitSearch,
  periodReport,
  shiftMonth,
} from "@/lib/habit-explore";
import { HABIT_STORAGE_KEY } from "@/lib/habit-storage";
import type { HabitData } from "@/lib/habit-model";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
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
    entries: [
      {
        habitId: "h1",
        date: "2026-10-18",
        done: true,
        value: 20,
        note: "PRIVATE_SENTINEL",
        reflection: null,
        updatedAt: "2026-10-18T00:00:00Z",
      },
      {
        habitId: "h1",
        date: "2026-10-17",
        done: false,
        value: 5,
        note: null,
        reflection: null,
        updatedAt: "2026-10-17T00:00:00Z",
      },
    ],
  };
}
beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Kalender, riwayat, dan statistik", () => {
  it("memvalidasi view tanpa mewajibkan search pada link lama", () => {
    expect(parseHabitSearch({})).toEqual({});
    expect(parseHabitSearch({ view: "statistik" })).toEqual({ view: "statistik" });
    expect(parseHabitSearch({ view: "asing" })).toEqual({});
  });
  it("membuat kalender Senin-Minggu, menggeser bulan, dan membatasi rentang tanpa pemotongan diam-diam", () => {
    const cells = monthCells("2026-10");
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells[3]).toBe("2026-10-01");
    expect(cells.length % 7).toBe(0);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(dateRange("2026-10-17", "2026-10-18")).toHaveLength(2);
    expect(() => dateRange("2025-01-01", "2026-10-18")).toThrow();
    expect(() => dateRange("2026-10-19", "2026-10-18")).toThrow();
  });
  it("menyaring status dan habit tanpa mengubah sumber atau menganggap belum dicatat sebagai gagal", () => {
    const data = fixture();
    const raw = JSON.stringify(data);
    expect(historyRows(data, "2026-10-16", "2026-10-18").map((row) => row.state)).toEqual([
      "done",
      "partial",
      "unrecorded",
    ]);
    expect(historyRows(data, "2026-10-16", "2026-10-18", "h1", "done")).toHaveLength(1);
    expect(historyRows(data, "2026-10-16", "2026-10-18", "asing")).toHaveLength(0);
    expect(JSON.stringify(data)).toBe(raw);
  });
  it("menjaga catatan di luar jadwal dan catatan orphan terlihat tetapi tidak masuk statistik terjadwal", () => {
    const data = fixture();
    data.habits[0]!.inactiveFrom = "2026-10-18";
    data.habits[0]!.status = "paused";
    data.entries.push({ ...data.entries[0]!, habitId: "hilang" });
    const rows = historyRows(data, "2026-10-18", "2026-10-18");
    expect(rows.map((row) => row.state).sort()).toEqual(["off-recorded", "orphan"]);
    const report = periodReport(data, "2026-10-18", 7);
    expect(report.ignored).toBe(2);
    expect(report.trend.done).toBe(0);
  });
  it("memisahkan akumulasi target historis, aktual tercatat, cakupan, dan penyelesaian", () => {
    const data = fixture();
    data.habits[0]!.targetHistory = [
      { from: "2026-10-01", target: 15, unit: "menit" },
      { from: "2026-10-19", target: 30, unit: "menit" },
    ];
    data.entries = [data.entries[0]!, { ...data.entries[0]!, date: "2026-10-19", done: false }];
    const report = periodReport(data, "2026-10-19", 7);
    const value = report.perHabit[0]?.measurement;
    expect(value?.planned).toBe(120);
    expect(value?.actual).toBe(40);
    expect(value?.recorded).toBe(2);
    expect(value?.attainment).toBe(33.3);
    expect(report.trend.percent).toBe(14);
    expect(periodReport(data, "2026-09-30", 7).trend.percent).toBeNull();
  });
  it("menghubungkan filter, reset, klik kalender dan pembukaan catatan pribadi tanpa menulis storage", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 18, 12));
    const raw = JSON.stringify(fixture());
    window.localStorage.setItem(HABIT_STORAGE_KEY, raw);
    const write = vi.spyOn(Storage.prototype, "setItem");
    render(<HabitHistory />);
    await screen.findByRole("heading", { name: "Kalender & Riwayat" });
    expect(screen.queryByText("PRIVATE_SENTINEL")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "done" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByText("Catatan pribadi"));
    expect(await screen.findByText("PRIVATE_SENTINEL")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hapus filter" }));
    fireEvent.click(screen.getByRole("button", { name: /^Lihat tanggal 2026-10-17:/ }));
    expect(screen.getByLabelText("Dari tanggal")).toHaveValue("2026-10-17");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(write).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBe(raw);
  });
  it("mengganti rentang statistik dan menyediakan tabel tanpa menampilkan catatan pribadi", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 18, 12));
    window.localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(fixture()));
    render(<HabitStatistics />);
    await screen.findByRole("heading", { name: "Statistik kebiasaan" });
    fireEvent.click(screen.getByRole("button", { name: "30 hari" }));
    fireEvent.click(screen.getByText("Tabel rincian tren"));
    expect(
      within(screen.getByRole("table", { name: "Tren pelaksanaan 30 hari" })).getAllByRole("row"),
    ).toHaveLength(31);
    expect(screen.queryByText("PRIVATE_SENTINEL")).not.toBeInTheDocument();
  });
  it("menampilkan error dan mempertahankan data rusak tanpa backup pada tampilan baca-saja", async () => {
    window.localStorage.setItem(HABIT_STORAGE_KEY, "{rusak");
    const write = vi.spyOn(Storage.prototype, "setItem");
    render(<HabitHistory />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Data membutuhkan pemeriksaan");
    expect(write).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBe("{rusak");
  });
});
