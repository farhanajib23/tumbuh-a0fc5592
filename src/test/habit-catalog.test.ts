import { describe, expect, it } from "vitest";
import { habitCatalog, habitCategories } from "@/lib/habit-catalog";

describe("Katalog awal habit TUMBUH", () => {
  it("memuat tepat sepuluh nama yang disepakati", () => {
    expect(habitCatalog.map((h) => h.name)).toEqual([
      "Aktivitas Fisik Harian",
      "Tidur Konsisten",
      "Membaca",
      "Latihan Keterampilan",
      "Jurnal Harian",
      "Check-in Emosi",
      "Menentukan Prioritas Harian",
      "Sesi Fokus",
      "Catat Pengeluaran",
      "Menjaga Hubungan Bermakna",
    ]);
  });

  it("memiliki ID unik dan lima kategori berisi dua habit", () => {
    expect(new Set(habitCatalog.map((h) => h.id)).size).toBe(10);
    expect(habitCategories.map((c) => c.name)).toEqual([
      "Kesehatan & Energi",
      "Belajar & Pengembangan Diri",
      "Kesadaran Diri & Refleksi",
      "Fokus & Pengelolaan Waktu",
      "Finansial & Hubungan",
    ]);
    for (const category of habitCategories) {
      expect(habitCatalog.filter((h) => h.categoryId === category.id)).toHaveLength(2);
    }
    for (const habit of habitCatalog) {
      expect(habitCategories.some((c) => c.id === habit.categoryId)).toBe(true);
      expect(habit.purpose.trim()).not.toBe("");
      expect(habit.targetExample.trim()).not.toBe("");
    }
  });
});
