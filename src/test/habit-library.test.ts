import { describe, expect, it } from "vitest";
import { activities, categories, sources, type EvidenceLevel } from "@/lib/activities";

describe("Habit activity library", () => {
  it("contains all 60 requested activities", () => {
    expect(activities).toHaveLength(60);
  });

  it("uses only valid categories and evidence labels", () => {
    const categoryIds = new Set(categories.map(c => c.id));
    const levels: EvidenceLevel[] = ["A", "B", "C"];
    for (const a of activities) {
      expect(categoryIds.has(a.category)).toBe(true);
      expect(levels).toContain(a.evidence);
    }
  });

  it("links only to real, declared sources with URLs", () => {
    for (const a of activities) {
      expect(a.sourceKeys.length).toBeLessThanOrEqual(3);
      for (const key of a.sourceKeys) {
        const s = sources[key];
        expect(s, `source ${key}`).toBeDefined();
        expect(s?.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("labels book/app inspirations honestly as not proof of efficacy", () => {
    for (const key of ["atomic", "tiny", "fiveam", "deepwork", "fabulous", "finch"]) {
      expect(sources[key]?.label).toContain("bukan bukti efektivitas");
    }
  });

  it("never presents practical doses as scientific optima", () => {
    // Practical dose formats must be flagged as practical, not scientific.
    const doseActivities = activities.filter(a => /10 menit|25 menit|dua halaman|lima menit|05\.00/.test(a.title));
    for (const a of doseActivities) {
      const combined = `${a.title} ${a.evidenceNote}`;
      expect(combined).toMatch(/bukan dosis optimal|format (awal )?praktis|contoh opsional|inspirasi|titik awal praktis|konvensi praktis/i);
    }
  });

  it("has no empty required fields", () => {
    for (const a of activities) {
      for (const field of [a.title, a.steps, a.trigger, a.why, a.evidenceNote, a.limits, a.start, a.measure]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
