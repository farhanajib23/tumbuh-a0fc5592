import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StatisticsDashboardBody } from "../components/tumbuh/statistics-dashboard";
import type { HabitData } from "../lib/habit-model";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#history">{children}</a>,
}));
afterEach(() => cleanup());
const today = "2026-10-18";
function fixture(): HabitData {
  const base = {
    purpose: "",
    status: "active" as const,
    inactiveFrom: null,
    scheduleHistory: [{ from: today, schedule: { kind: "daily" as const } }],
    reminderTime: null,
    createdAt: `${today}T00:00:00Z`,
    updatedAt: `${today}T00:00:00Z`,
  };
  return {
    version: 2,
    habits: [
      {
        ...base,
        id: "read",
        templateId: "reading",
        name: "Membaca",
        categoryId: "learning",
        target: 30,
        unit: "menit",
      },
      {
        ...base,
        id: "priority",
        templateId: "daily-priorities",
        name: "Prioritas",
        categoryId: "focus",
        target: null,
        unit: null,
      },
    ],
    entries: [
      {
        habitId: "read",
        date: today,
        done: false,
        value: 10,
        note: null,
        reflection: null,
        updatedAt: `${today}T01:00:00Z`,
      },
      {
        habitId: "priority",
        date: today,
        done: true,
        value: null,
        note: null,
        reflection: null,
        updatedAt: `${today}T01:00:00Z`,
      },
    ],
  };
}
describe("Statistik bergaya Dashboard", () => {
  it("memisahkan penyelesaian dari capaian angka dan menaruh ring sebelum analitik", () => {
    render(<StatisticsDashboardBody data={fixture()} today={today} onRefresh={vi.fn()} />);
    const ring = screen.getByRole("progressbar");
    expect(ring).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("33,3%")).toBeInTheDocument();
    const analytics = screen.getByRole("region", { name: "Analitik kebiasaan" });
    expect(ring.compareDocumentPosition(analytics) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });
  it("mengganti filter dan periode tanpa mengubah data", () => {
    const data = fixture();
    const before = JSON.stringify(data);
    render(<StatisticsDashboardBody data={data} today={today} onRefresh={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Kebiasaan"), { target: { value: "read" } });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    fireEvent.click(screen.getByRole("button", { name: "30 hari" }));
    expect(screen.getByRole("button", { name: "30 hari" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hapus filter" }));
    expect(screen.getByLabelText("Kebiasaan")).toHaveValue("all");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(JSON.stringify(data)).toBe(before);
  });
  it("membedakan periode tanpa jadwal dari nilai nol dan menyediakan refresh", () => {
    const refresh = vi.fn();
    render(<StatisticsDashboardBody data={fixture()} today={today} onRefresh={refresh} />);
    fireEvent.change(screen.getByLabelText("Akhir periode statistik"), {
      target: { value: "2026-10-17" },
    });
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Tidak ada jadwal");
    fireEvent.click(screen.getByRole("button", { name: "Perbarui statistik" }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
