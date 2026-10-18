import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HabitDashboardSummary } from "@/components/tumbuh/habit-dashboard-summary";
import { readHabitView, summarizeHabitView } from "@/lib/habit-read-view";
import { HABIT_STORAGE_KEY, LEGACY_HABIT_STORAGE_KEY } from "@/lib/habit-storage";
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
        note: "PRIVATE_NOTE_SENTINEL",
        reflection: null,
        updatedAt: "2026-10-18T00:00:00Z",
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

describe("Ringkasan habit baca-saja", () => {
  it("membaca data valid tanpa menulis atau menyentuh v1", () => {
    const raw = JSON.stringify(fixture());
    window.localStorage.setItem(HABIT_STORAGE_KEY, raw);
    window.localStorage.setItem(LEGACY_HABIT_STORAGE_KEY, "v1 tetap");
    const write = vi.spyOn(Storage.prototype, "setItem");
    expect(readHabitView(window.localStorage).status).toBe("ok");
    expect(write).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBe(raw);
    expect(window.localStorage.getItem(LEGACY_HABIT_STORAGE_KEY)).toBe("v1 tetap");
  });
  it("tidak membuat backup atau mengganti data rusak dan data yang perlu normalisasi", () => {
    for (const raw of ["{rusak", JSON.stringify({ ...fixture(), futureField: "tetap" })]) {
      window.localStorage.setItem(HABIT_STORAGE_KEY, raw);
      const write = vi.spyOn(Storage.prototype, "setItem");
      const result = readHabitView(window.localStorage);
      expect(["unreadable", "recovered"]).toContain(result.status);
      expect(result.backedUp).toBe(false);
      expect(write).not.toHaveBeenCalled();
      expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBe(raw);
      write.mockRestore();
    }
  });
  it("membedakan storage tidak tersedia dari data kosong", () => {
    expect(readHabitView(null).status).toBe("unavailable");
    expect(
      readHabitView({
        getItem: () => {
          throw new Error("Ditolak");
        },
      }).status,
    ).toBe("unavailable");
    expect(readHabitView({ getItem: () => null }).status).toBe("empty");
  });
  it("membedakan selesai, parsial, tidak dilakukan, dan belum dicatat tanpa mengubah sumber", () => {
    const data = fixture();
    const original = data.habits[0]!;
    data.habits = [
      original,
      { ...original, id: "h2", templateId: "skill-practice" },
      { ...original, id: "h3", templateId: "daily-priorities", target: null, unit: null },
      { ...original, id: "h4", templateId: "focus-session" },
    ];
    data.entries.push(
      { ...data.entries[0]!, habitId: "h2", done: false, value: 5 },
      { ...data.entries[0]!, habitId: "h3", done: false, value: null },
    );
    const raw = JSON.stringify(data);
    const result = summarizeHabitView(data, "2026-10-18");
    expect(result.counts).toEqual({ done: 1, partial: 1, recordedNotDone: 1, unrecorded: 1 });
    expect(result.day.percent).toBe(25);
    expect(result.seven.days).toHaveLength(7);
    expect(result.thirty.days).toHaveLength(30);
    expect(JSON.stringify(data)).toBe(raw);
  });
  it("memisahkan capaian angka dari completion dan memakai target historis", () => {
    const data = fixture();
    data.habits[0]!.targetHistory = [
      { from: "2026-10-01", target: 15, unit: "menit" },
      { from: "2026-10-19", target: 30, unit: "menit" },
    ];
    data.entries.push({ ...data.entries[0]!, date: "2026-10-19", done: false });
    const earlier = summarizeHabitView(data, "2026-10-18");
    const later = summarizeHabitView(data, "2026-10-19");
    expect(earlier.day.percent).toBe(100);
    expect(earlier.measured[0]?.attainment).toBe(133.3);
    expect(later.day.percent).toBe(0);
    expect(later.measured[0]?.target).toBe(30);
    expect(later.measured[0]?.attainment).toBe(66.7);
    expect(summarizeHabitView(data, "2026-10-20").measured[0]?.actual).toBeNull();
  });
  it("menampilkan empty state tanpa data contoh", async () => {
    render(<HabitDashboardSummary />);
    expect(
      await screen.findByRole("heading", { name: "Mulai dari satu kebiasaan yang berarti" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBeNull();
  });
  it("menampilkan error, bukan angka kosong palsu, pada data rusak", async () => {
    window.localStorage.setItem(HABIT_STORAGE_KEY, "{rusak");
    render(<HabitDashboardSummary />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Data membutuhkan pemeriksaan");
    expect(screen.queryByText("Ringkasan kebiasaan hari ini")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(HABIT_STORAGE_KEY)).toBe("{rusak");
  });
  it("menampilkan data nyata, mengganti rentang tren, dan tidak merender isi catatan pribadi", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 18, 12));
    window.localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(fixture()));
    const write = vi.spyOn(Storage.prototype, "setItem");
    render(<HabitDashboardSummary />);
    expect(
      await screen.findByRole("heading", { name: "Ringkasan kebiasaan hari ini" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("PRIVATE_NOTE_SENTINEL")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "30 hari" }));
    fireEvent.click(screen.getByText("Rincian tren dalam tabel"));
    const table = screen.getByRole("table", { name: "Tren penyelesaian 30 hari terakhir" });
    expect(within(table).getAllByRole("row")).toHaveLength(31);
    expect(write).not.toHaveBeenCalled();
  });
});
